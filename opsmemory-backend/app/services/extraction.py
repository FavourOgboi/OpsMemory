"""
OpsMemory — Extraction Pipeline

The core intelligence layer. Every incoming WhatsApp message passes through here.
Handles: text extraction (GPT-4o-mini), voice transcription (Whisper),
image/receipt analysis (GPT-4o-mini vision), and response generation.

Supports Nigerian English, Pidgin, Yoruba, and Igbo.
"""

from app.config import settings
from app.models.schemas import ExtractedData, Language
from app.services.llm_client import get_llm_client, get_whisper_client, resolve_model
import httpx
import json
import io
import logging

logger = logging.getLogger(__name__)


# ── System Prompts ────────────────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """
You are an expert extraction system for a Nigerian business communication platform.
You receive raw WhatsApp messages from Nigerian customers — in English, Pidgin, Yoruba, Igbo, or mixed.
You must extract structured data from every message with precision.

Return ONLY a valid JSON object. No explanation. No markdown. No preamble. Just JSON.

The JSON must match this exact schema:
{
  "intent": string,  // one of: payment_claim, order_request, delivery_inquiry, complaint, price_inquiry, general_inquiry, balance_inquiry, payment_promise, deal_negotiation, confirmation, greeting
  "amount": number or null,  // in NGN, extract from text like "150k" = 150000, "1.5m" = 1500000
  "order_ref": string or null,  // e.g. "2841", "ORD-001"
  "customer_name": string or null,  // if they mention their name
  "product_mentioned": string or null,
  "date_mentioned": string or null,  // e.g. "Monday", "tomorrow", "3rd June"
  "language": string,  // one of: english, pidgin, yoruba, igbo, hausa
  "sentiment": string,  // one of: positive, neutral, negative, urgent
  "confidence": number,  // 0.0 to 1.0
  "is_payment_proof": boolean,  // true only if an image is attached AND it appears to be a payment receipt
  "payment_amount_from_image": number or null,  // extracted from receipt image
  "bank_name": string or null,  // e.g. "GTBank", "Access", "Zenith"
  "transaction_id": string or null
}

Nigerian Pidgin signals: "oga", "abeg", "na", "sha", "dey", "wahala", "done pay", "go pay"
Amount parsing: "150k" = 150000, "1.5m" = 1500000, "two hundred" = 200000, "₦45,000" = 45000
Use balance_inquiry when the customer asks about outstanding balance, what they owe, invoice due, or account balance.
"""

IMAGE_EXTRACTION_PROMPT = """
This image is from a Nigerian WhatsApp business conversation.
If it is a bank transfer receipt or payment confirmation, extract:
- amount (number in NGN)
- bank_name (string)
- transaction_id (string or null)
- recipient_name (string or null)
- transfer_date (string or null)

Return ONLY valid JSON: {"is_payment_proof": true/false, "amount": number or null, "bank_name": string or null, "transaction_id": string or null}
If it is not a payment proof, return: {"is_payment_proof": false, "amount": null, "bank_name": null, "transaction_id": null}
"""


# ── Voice Transcription ──────────────────────────────────────────────────────

async def transcribe_voice_note(audio_url: str) -> str:
    """Downloads audio from WhatsApp URL and transcribes via Whisper."""
    async with httpx.AsyncClient() as http:
        headers = {"Authorization": f"Bearer {settings.meta_whatsapp_token}"}
        audio_response = await http.get(audio_url, headers=headers)

    audio_bytes = audio_response.content
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "voice.ogg"

    from app.config import settings as app_settings

    whisper_client = get_whisper_client()
    transcript = await whisper_client.audio.transcriptions.create(
        model=app_settings.openrouter_whisper_model,
        file=audio_file,
        language=None,  # Auto-detect — handles Pidgin and Nigerian English
        prompt="This is a Nigerian business WhatsApp voice message. May include Pidgin, Yoruba, Igbo, or English.",
    )
    return transcript.text


# ── Image Analysis ────────────────────────────────────────────────────────────

async def extract_from_image(image_url: str) -> dict:
    """Sends image to GPT-4o-mini vision for receipt extraction."""
    client = get_llm_client("cheap")
    response = await client.chat.completions.create(
        model=resolve_model("cheap"),
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": IMAGE_EXTRACTION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url, "detail": "low"},
                    },
                ],
            }
        ],
        max_tokens=200,
        temperature=0,
    )
    raw = response.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except Exception:
        # JSON-repair fallback: look for first { and last }
        try:
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1:
                return json.loads(raw[start:end+1])
        except Exception:
            pass
        logger.warning(f"Failed to parse image extraction JSON: {raw[:200]}")
        return {
            "is_payment_proof": False,
            "amount": None,
            "bank_name": None,
            "transaction_id": None,
        }


# ── Text Extraction ──────────────────────────────────────────────────────────

async def extract_from_text(
    message_text: str,
    image_context: dict = None,
) -> ExtractedData:
    """
    Main extraction function. Takes message text (already transcribed if voice)
    and optional image context, returns structured ExtractedData.
    """
    user_content = f"Message: {message_text}"
    if image_context and image_context.get("is_payment_proof"):
        user_content += (
            f"\n\nImage attached — appears to be a payment receipt. "
            f"Extracted from image: {json.dumps(image_context)}"
        )

    client = get_llm_client("cheap")
    response = await client.chat.completions.create(
        model=resolve_model("cheap"),
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        max_tokens=300,
        temperature=0,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    try:
        data = json.loads(raw)
    except Exception:
        # JSON-repair fallback for models that ignore response_format
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            try:
                data = json.loads(raw[start:end+1])
            except Exception:
                logger.error(f"Failed to parse extraction JSON: {raw[:300]}")
                data = {
                    "intent": "general_inquiry",
                    "amount": None,
                    "order_ref": None,
                    "customer_name": None,
                    "product_mentioned": None,
                    "date_mentioned": None,
                    "language": "english",
                    "sentiment": "neutral",
                    "confidence": 0.5,
                    "is_payment_proof": False,
                    "payment_amount_from_image": None,
                    "bank_name": None,
                    "transaction_id": None,
                }
        else:
            data = {
                "intent": "general_inquiry",
                "amount": None,
                "order_ref": None,
                "customer_name": None,
                "product_mentioned": None,
                "date_mentioned": None,
                "language": "english",
                "sentiment": "neutral",
                "confidence": 0.5,
                "is_payment_proof": False,
                "payment_amount_from_image": None,
                "bank_name": None,
                "transaction_id": None,
            }

    # Merge image context into extraction result
    if image_context:
        data["is_payment_proof"] = image_context.get("is_payment_proof", False)
        if image_context.get("amount"):
            data["payment_amount_from_image"] = image_context["amount"]
        if image_context.get("bank_name"):
            data["bank_name"] = image_context["bank_name"]
        if image_context.get("transaction_id"):
            data["transaction_id"] = image_context["transaction_id"]

    return ExtractedData(**data)


# ── Response Generation ──────────────────────────────────────────────────────

async def generate_customer_response(
    business_id: str,
    business_name: str,
    business_type: str,
    customer_name: str,
    language: str,
    conversation_history: list,
    agent_recommendation: str,
    extracted_data: ExtractedData,
    customer: dict = None,
) -> str:
    """
    Generates a customer-facing WhatsApp reply in the customer's detected language.
    Now includes RAG retrieval — searches knowledge base before responding.
    Never reveals that it's an AI — always speaks as the business.
    """
    from app.services.rag import retrieve_relevant_knowledge, format_knowledge_for_prompt

    last_inbound = ""
    if conversation_history:
        for msg in reversed(conversation_history):
            if msg.get("direction") == "inbound":
                last_inbound = msg.get("content", "") or ""
                break

    intent = extracted_data.intent or "general_inquiry"
    product_keywords = (
        "product", "price", "rice", "beans", "fertilizer", "seed", "oil", "feed",
        "catalogue", "catalog", "sell", "stock", "cost",
    )
    balance_keywords = (
        "outstanding balance", "my balance", "what do i owe", "how much do i owe",
        "balance on", "amount owing", "invoice due", "dey owe", "unpaid",
    )
    lower_inbound = (last_inbound or "").lower()
    is_balance_question = intent == "balance_inquiry" or any(
        k in lower_inbound for k in balance_keywords
    )
    mentions_products = any(k in lower_inbound for k in product_keywords)

    # ── RAG RETRIEVAL (catalog/FAQ — not for balance-only questions) ──
    knowledge_context = ""
    if not is_balance_question and (
        intent in ("price_inquiry", "order_request")
        or (intent == "general_inquiry" and mentions_products)
        or mentions_products
    ):
        search_query = extracted_data.product_mentioned or last_inbound[:120]
        if search_query:
            relevant_chunks = await retrieve_relevant_knowledge(
                business_id=business_id,
                query=search_query,
                top_k=5,
                threshold=0.72,
            )
            knowledge_context = format_knowledge_for_prompt(relevant_chunks)

    # ── LANGUAGE INSTRUCTIONS ─────────────────────────────────────────────────
    language_instructions = {
        "pidgin": (
            "Respond ONLY in Nigerian Pidgin English. Be warm and natural. "
            "Use common Pidgin phrases like 'oga', 'abeg', 'e don do', 'we go sort am'. "
            "Sound like a smart Lagos sales rep."
        ),
        "yoruba": (
            "Respond in English but include appropriate Yoruba greetings "
            "(e kaaro/e kaale by time of day) and respectful phrases. Warm and professional."
        ),
        "igbo": (
            "Respond in English but include appropriate Igbo greetings "
            "(ndewo, biko) and maintain warm Igbo communication style."
        ),
        "english": (
            "Respond in professional Nigerian business English. "
            "Warm, competent, human. Not overly formal."
        ),
        "hausa": (
            "Respond in clear English with respectful Hausa greetings (sannu, na gode) "
            "where natural. Warm Northern Nigerian business tone."
        ),
    }

    # ── CUSTOMER CONTEXT ──────────────────────────────────────────────────────
    customer_context = ""
    if customer:
        total_spent = customer.get("total_revenue", 0)
        days_since_order = customer.get("days_since_last_order", 0)
        churn_risk = customer.get("churn_risk", "unknown")
        health_score = customer.get("health_score", 50)
        
        open_invoices = customer.get("open_invoices", 0)
        outstanding = float(customer.get("outstanding_balance") or 0)
        customer_context = f"""
CUSTOMER PROFILE:
- Total lifetime spending: ₦{total_spent:,.0f}
- Outstanding balance: ₦{outstanding:,.0f}
- Open invoices: {open_invoices}
- Days since last order: {days_since_order}
- Churn risk: {churn_risk}
- Relationship health: {health_score}/100

TONE GUIDANCE:
- If total_spent > ₦500,000: Be warmer and more patient with this loyal customer
- If churn_risk is 'high': Extra effort to retain them
"""

    intent_guidance = ""
    if is_balance_question:
        outstanding = float((customer or {}).get("outstanding_balance") or 0)
        open_invoices = int((customer or {}).get("open_invoices") or 0)
        if outstanding > 0:
            intent_guidance = f"""
CURRENT TASK: The customer asked about their outstanding balance.
Answer directly: they owe ₦{outstanding:,.0f} across {open_invoices} open invoice(s).
Offer one clear next step (payment details, speak to finance, or confirm a payment they already made).
Do NOT list product categories or give a generic company introduction.
Keep it to 2–4 short WhatsApp sentences.
"""
        else:
            intent_guidance = """
CURRENT TASK: The customer asked about their outstanding balance.
Answer directly: they have ₦0 outstanding on their account — all clear.
Invite them to place an order or ask if they need anything else.
Do NOT list product categories unless they explicitly asked for products.
Keep it to 2–4 short WhatsApp sentences.
"""
    elif intent in ("price_inquiry", "order_request") or mentions_products:
        intent_guidance = """
CURRENT TASK: Customer asked about products or prices.
Use ONLY prices and product names from the knowledge base below.
Give specific ₦ amounts per unit. If they asked for a list, list 4-6 main items max.
End with one question to move toward order (quantity, delivery area).
Do NOT discuss account balance unless they asked for it.
Keep under 80 words.
"""
    elif intent == "general_inquiry" and (
        "bola" in lower_inbound or "company" in lower_inbound or "about" in lower_inbound
    ):
        intent_guidance = """
CURRENT TASK: Customer wants to know about the business.
Briefly describe Bola Agro Supplies (Lagos agro distributor: grains, oils, fertilizer, seeds, feed).
Mention you can share prices and delivery terms. 3-4 sentences max.
"""

    system_prompt = f"""You are a sharp, warm sales representative for {business_name}, a {business_type} business.
You know the business inside out and genuinely care about customers.

CRITICAL RULES:
- {language_instructions.get(language, language_instructions['english'])}
- Never reveal you are an AI or automated system.
- Never say 'As an AI' or any similar phrase.
- You ARE the business. You represent the business completely.
- Be warm, helpful, and concise — WhatsApp messages should be short.

SCOPE — THIS IS NON-NEGOTIABLE:
- You ONLY help with matters related to {business_name}'s products, orders, payments, deliveries, and services.
- You DO NOT discuss: sports, news, politics, weather, entertainment, general knowledge, or ANY topic unrelated to this business.
- If a customer raises an off-topic subject (e.g. football, music, general life advice), respond warmly but redirect immediately.
- Example redirect: "Ha, I'll leave that to the experts! But for {business_name} matters I'm your person — anything on orders or pricing today?"
- You are a BUSINESS ASSISTANT, not a general chatbot or search engine.

WHEN CUSTOMERS OBJECT TO PRICE:
- Acknowledge their concern briefly
- Give ONE honest reason (inflation, naira rate, supply costs)
- Redirect to value or next step
- Never apologize for price. Never say "I'm sorry it's expensive"

WHEN YOU DON'T KNOW SOMETHING:
- Say you will check and follow up
- Never invent prices, products, or policies
- Only reference what's in the knowledge base below

{customer_context}

{intent_guidance}

{knowledge_context}

Detected intent: {intent}
Agent recommendation: {agent_recommendation}
Customer name: {customer_name}
"""

    # Include last 6 messages for context
    messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation_history[-6:]:
        role = "user" if msg["direction"] == "inbound" else "assistant"
        messages.append({"role": role, "content": msg["content"]})

    reply_temperature = 0.25 if (is_balance_question or intent in ("price_inquiry", "order_request")) else 0.45

    client = get_llm_client("cheap")
    response = await client.chat.completions.create(
        model=resolve_model("cheap"),
        messages=messages,
        max_tokens=220,
        temperature=reply_temperature,
    )
    return response.choices[0].message.content.strip()
