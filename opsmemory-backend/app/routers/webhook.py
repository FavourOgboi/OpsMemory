"""
OpsMemory — WhatsApp Webhook Router

Handles incoming messages from both Meta WhatsApp Business API and Twilio sandbox.
Both paths converge into a shared pipeline: extract → match → store → agents → respond.

Every operation is scoped to the business_id in the URL path.
"""

from fastapi import APIRouter, Request, HTTPException, Query, BackgroundTasks
from fastapi.responses import PlainTextResponse, JSONResponse
import hashlib
import hmac
import json
import logging

from app.config import settings
from app.services.extraction import (
    extract_from_text,
    extract_from_image,
    transcribe_voice_note,
)
from app.services.entity_matching import resolve_customer
from app.database import (
    supabase,
    get_business_by_id,
    get_customer_by_phone,
    get_or_create_conversation,
    insert_message,
    insert_event,
    get_business_customers,
    create_customer,
)
router = APIRouter(prefix="/webhook", tags=["webhook"])
logger = logging.getLogger(__name__)


# ── META WHATSAPP BUSINESS API ─────────────────────────────────────────────────

@router.get("/whatsapp/{business_id}")
async def verify_meta_webhook(
    business_id: str,
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    """
    Meta sends a GET to verify the webhook endpoint.
    Must respond with hub.challenge if the verify token matches.
    """
    if (
        hub_mode == "subscribe"
        and hub_verify_token == settings.meta_whatsapp_verify_token
    ):
        logger.info(f"Webhook verified for business {business_id}")
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp/{business_id}")
async def receive_meta_message(
    business_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Receives incoming WhatsApp messages from Meta.
    Verifies HMAC signature, then processes asynchronously.
    """
    body = await request.body()

    # HMAC signature verification (uses Meta App Secret, not the access token)
    signature = request.headers.get("X-Hub-Signature-256", "")
    if signature and settings.meta_app_secret:
        expected = "sha256=" + hmac.new(
            settings.meta_app_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=401, detail="Invalid signature")
    elif signature and not settings.meta_app_secret:
        logger.warning(
            "META_APP_SECRET not set — skipping webhook signature verification"
        )

    payload = json.loads(body)
    background_tasks.add_task(process_meta_message, business_id, payload)
    return JSONResponse({"status": "received"})


async def process_meta_message(business_id: str, payload: dict):
    """Background task — processes a Meta WhatsApp message through the pipeline."""
    try:
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return

        message = messages[0]
        sender_phone = message.get("from")
        msg_type = message.get("type")  # text, image, audio, document
        whatsapp_msg_id = message.get("id")

        # Deduplication
        existing = (
            supabase.table("messages")
            .select("id")
            .eq("whatsapp_message_id", whatsapp_msg_id)
            .maybeSingle()
            .execute()
        )
        if existing.data:
            return

        # Extract content based on type
        raw_content = ""
        media_url = None
        image_context = None

        if msg_type == "text":
            raw_content = message.get("text", {}).get("body", "")
        elif msg_type == "audio":
            audio_url = message.get("audio", {}).get("url")
            media_url = audio_url
            raw_content = await transcribe_voice_note(audio_url)
        elif msg_type == "image":
            img_url = message.get("image", {}).get("url")
            media_url = img_url
            raw_content = (
                message.get("image", {}).get("caption", "") or "Image received"
            )
            image_context = await extract_from_image(img_url)
        elif msg_type == "document":
            raw_content = (
                message.get("document", {}).get("caption", "")
                or "Document received"
            )
        else:
            return  # Skip unsupported types

        await process_incoming_message(
            business_id=business_id,
            sender_phone=sender_phone,
            raw_content=raw_content,
            media_type=msg_type,
            media_url=media_url,
            image_context=image_context,
            whatsapp_msg_id=whatsapp_msg_id,
            inbound_channel="meta",
        )

    except Exception as e:
        logger.error(
            f"Error processing Meta message for business {business_id}: {e}",
            exc_info=True,
        )


# ── TWILIO SANDBOX ─────────────────────────────────────────────────────────────

@router.post("/twilio/{business_id}")
async def receive_twilio_message(
    business_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Receives WhatsApp messages via Twilio sandbox.
    Used during development. No HMAC verification needed for sandbox.

    Configure in Twilio Console → Messaging → Try WhatsApp → Sandbox settings:
    When a message comes in → POST {BASE_URL}/webhook/twilio/{business_id}
    """
    form_data = await request.form()
    sender_phone = str(form_data.get("From", "")).replace("whatsapp:", "")
    body = str(form_data.get("Body", ""))
    logger.info(
        "Twilio inbound for business %s from %s: %s",
        business_id,
        sender_phone,
        (body or "")[:80],
    )
    media_url = form_data.get("MediaUrl0")
    media_type = str(form_data.get("MediaContentType0", ""))
    msg_sid = str(form_data.get("MessageSid", ""))
    num_media = int(form_data.get("NumMedia", "0"))

    # Determine message type and extract content
    image_context = None
    if num_media > 0 and "audio" in media_type:
        raw_content = await transcribe_voice_note(str(media_url))
        msg_type = "voice"
    elif num_media > 0 and "image" in media_type:
        image_context = await extract_from_image(str(media_url))
        raw_content = body or "Image received"
        msg_type = "image"
    else:
        raw_content = body
        msg_type = "text"

    background_tasks.add_task(
        process_incoming_message,
        business_id=business_id,
        sender_phone=sender_phone,
        raw_content=raw_content,
        media_type=msg_type,
        media_url=str(media_url) if media_url else None,
        image_context=image_context,
        whatsapp_msg_id=msg_sid,
        inbound_channel="twilio",
    )

    return PlainTextResponse("", status_code=200)


# ── SHARED PROCESSING PIPELINE ─────────────────────────────────────────────────

async def process_incoming_message(
    business_id: str,
    sender_phone: str,
    raw_content: str,
    media_type: str,
    media_url: str,
    image_context: dict,
    whatsapp_msg_id: str,
    inbound_channel: str = "twilio",
):
    """
    The core pipeline. Runs for every incoming message regardless of source.
    Steps: extract → match → store → update state → trigger agents → respond.
    All operations are scoped to business_id.
    """
    # Validate business exists
    business = await get_business_by_id(business_id)
    if not business:
        logger.error(f"Business {business_id} not found")
        return

    # ── STEP 1: Extract structured data ──────────────────────────────────
    extracted = await extract_from_text(raw_content, image_context)

    # ── STEP 2: Resolve customer (scoped to this business) ───────────────
    all_customers = await get_business_customers(business_id)
    customer = await resolve_customer(
        business_id=business_id,
        sender_phone=sender_phone,
        extracted_name=extracted.customer_name,
        existing_customers=all_customers,
        db_get_by_phone=get_customer_by_phone,
        db_create_customer=create_customer,
    )

    # ── STEP 3: Get or create conversation (scoped to this business) ─────
    conversation = await get_or_create_conversation(business_id, customer["id"])

    # ── STEP 4: Store message ────────────────────────────────────────────
    await insert_message({
        "business_id": business_id,
        "conversation_id": conversation["id"],
        "customer_id": customer["id"],
        "direction": "inbound",
        "content": raw_content,
        "raw_content": raw_content,
        "media_type": media_type,
        "media_url": media_url,
        "extracted_data": extracted.model_dump(),
        "whatsapp_message_id": whatsapp_msg_id,
    })

    # Update conversation last message
    supabase.table("conversations").update({
        "last_message": raw_content[:100],
        "last_message_at": "now()",
        "unread_count": conversation.get("unread_count", 0) + 1,
    }).eq("id", conversation["id"]).execute()

    # ── STEP 5: Update customer metrics & state ─────────────────────────
    from app.services.customer_metrics import refresh_customer_metrics

    customer = await refresh_customer_metrics(business_id, customer["id"]) or customer

    customer_updates = {"last_contact_at": "now()"}
    if extracted.language:
        lang_val = (
            extracted.language.value
            if hasattr(extracted.language, "value")
            else str(extracted.language)
        )
        customer_updates["language"] = lang_val
    supabase.table("customers").update(customer_updates) \
        .eq("id", customer["id"]) \
        .eq("business_id", business_id) \
        .execute()

    # ── STEP 6: Log live event ───────────────────────────────────────────
    event_map = {
        "payment_claim": ("payment_claimed", "positive", "Payment claimed"),
        "order_request": ("order_placed", "positive", "New order request"),
        "complaint": ("complaint_raised", "warning", "Customer complaint received"),
        "deal_negotiation": ("deal_initiated", "info", "Deal negotiation started"),
    }
    if extracted.intent in event_map:
        etype, severity, title = event_map[extracted.intent]
        await insert_event({
            "business_id": business_id,
            "customer_id": customer["id"],
            "event_type": etype,
            "severity": severity,
            "title": title,
            "description": raw_content[:150],
            "agent_name": None,
        })

    recent_messages = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", conversation["id"])
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data
    )
    recent_messages = list(reversed(recent_messages))

    # ── STEP 7–8: Agent orchestration + reply ─────────────────────────────
    from app.services.agent_orchestrator import orchestrate_reply
    from app.services.whatsapp import send_whatsapp_message, send_whatsapp_image

    result = await orchestrate_reply(
        business_id=business_id,
        business=business,
        customer=customer,
        extracted=extracted,
        messages=recent_messages,
        last_inbound=raw_content,
    )

    if result.should_send and result.text:
        if result.image_url:
            await send_whatsapp_image(
                business=business,
                to_phone=sender_phone,
                image_url=result.image_url,
                caption=result.text[:1024],
                reply_channel=inbound_channel,
            )
        else:
            await send_whatsapp_message(
                business=business,
                to_phone=sender_phone,
                message=result.text,
                reply_channel=inbound_channel,
            )
        await insert_message({
            "business_id": business_id,
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "direction": "outbound",
            "content": result.text,
            "media_type": "image" if result.image_url else "text",
            "media_url": result.image_url,
            "sent_by": None,
            "sent_by_agent": result.lead_agent,
        })
