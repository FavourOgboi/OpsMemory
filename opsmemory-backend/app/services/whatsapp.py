"""
OpsMemory — WhatsApp Message Sender

Supports Meta WhatsApp Cloud API and Twilio WhatsApp.
Provider is selected via WHATSAPP_PROVIDER (meta | twilio | auto).
"""

import httpx
import re
from twilio.rest import Client as TwilioClient
from app.config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)

twilio_client: TwilioClient | None = None


def _digits_only(phone: str) -> str:
    """E.164 digits without + (e.g. 2349064434659)."""
    return re.sub(r"\D", "", phone.replace("whatsapp:", ""))


def _to_whatsapp_address(phone: str) -> str:
    """Twilio requires whatsapp:+E164 on both from and to."""
    digits = _digits_only(phone)
    if not digits:
        raise ValueError(f"Invalid phone number: {phone!r}")
    if digits.startswith("0") and len(digits) >= 10:
        digits = "234" + digits[1:]
    return f"whatsapp:+{digits}"


def _from_twilio_whatsapp() -> str:
    return _to_whatsapp_address(settings.twilio_whatsapp_number)


def _resolve_provider(business: dict) -> str:
    pref = (settings.whatsapp_provider or "auto").lower()
    meta_ready = bool(settings.meta_whatsapp_token and settings.meta_phone_number_id)
    twilio_ready = bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_whatsapp_number
    )

    if pref == "meta":
        return "meta"
    if pref == "twilio":
        return "twilio"
    # auto: prefer Meta when Cloud API is configured (matches Meta developer test setup)
    if meta_ready:
        return "meta"
    if twilio_ready:
        return "twilio"
    return "meta" if business.get("whatsapp_connected") else "twilio"


def _get_twilio_client() -> TwilioClient:
    global twilio_client
    if twilio_client is None:
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            raise RuntimeError("Twilio credentials are not configured")
        twilio_client = TwilioClient(
            settings.twilio_account_sid,
            settings.twilio_auth_token,
        )
    return twilio_client


async def send_whatsapp_message(
    business: dict,
    to_phone: str,
    message: str,
    *,
    reply_channel: str | None = None,
) -> bool:
    """Send a WhatsApp text reply on behalf of a business.

    reply_channel: when set ('meta' | 'twilio'), reply on the same channel the
    customer used so the message appears in the correct WhatsApp thread.
    """
    provider = (reply_channel or _resolve_provider(business)).lower()
    strict = reply_channel is not None  # never cross-post to another WhatsApp thread

    if provider == "twilio":
        ok = await _send_via_twilio(to_phone, message)
        if ok:
            return True
        if strict:
            logger.error(
                "Twilio reply failed for %s (inbound was Twilio). Check sandbox webhook and verified recipient.",
                to_phone,
            )
            return False
        if settings.meta_whatsapp_token and settings.meta_phone_number_id:
            logger.warning("Twilio send failed; falling back to Meta WhatsApp API")
            return await _send_via_meta(business, to_phone, message)
        return False

    if provider == "meta":
        ok = await _send_via_meta(business, to_phone, message)
        if ok:
            return True
        if strict:
            logger.error(
                "Meta reply failed for %s (inbound was Meta). Refresh META_WHATSAPP_TOKEN in .env — "
                "replies must not be sent via Twilio or they appear in the wrong chat.",
                to_phone,
            )
            return False
        if (
            settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_whatsapp_number
        ):
            logger.warning("Meta send failed; falling back to Twilio")
            return await _send_via_twilio(to_phone, message)
        return False

    return await _send_via_meta(business, to_phone, message)


async def _send_via_twilio(to_phone: str, message: str) -> bool:
    """Send via Twilio WhatsApp (trial accounts: recipient must be verified in Twilio)."""
    if not settings.twilio_whatsapp_number:
        logger.error("TWILIO_WHATSAPP_NUMBER is not configured")
        return False

    from_addr = _from_twilio_whatsapp()
    to_addr = _to_whatsapp_address(to_phone)

    for attempt in range(2):
        try:
            client = _get_twilio_client()
            client.messages.create(
                body=message,
                from_=from_addr,
                to=to_addr,
            )
            logger.info("Twilio message sent from %s to %s", from_addr, to_addr)
            return True
        except Exception as e:
            logger.error("Twilio send error (attempt %s/2): %s", attempt + 1, e)
            if attempt == 0:
                await asyncio.sleep(1.0)
    return False


async def _send_via_meta(business: dict, to_phone: str, message: str) -> bool:
    """Send via Meta WhatsApp Cloud API."""
    if not settings.meta_phone_number_id:
        logger.error("META_PHONE_NUMBER_ID is not configured")
        return False
    if not settings.meta_whatsapp_token:
        logger.error("META_WHATSAPP_TOKEN is not configured")
        return False

    version = settings.meta_graph_api_version.lstrip("v")
    url = f"https://graph.facebook.com/v{version}/{settings.meta_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.meta_whatsapp_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": _digits_only(to_phone),
        "type": "text",
        "text": {"body": message},
    }

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                resp = await http_client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    logger.info("Meta message sent to %s", to_phone)
                    return True
                logger.error(
                    "Meta API error (attempt %s/2): status=%s body=%s",
                    attempt + 1,
                    resp.status_code,
                    resp.text,
                )
                if attempt == 0 and resp.status_code in (429, 500, 502, 503, 504):
                    await asyncio.sleep(2.0 * (attempt + 1))
                else:
                    break
        except httpx.TimeoutException:
            logger.error("Meta API timeout (attempt %s/2)", attempt + 1)
            if attempt == 0:
                await asyncio.sleep(2.0)
        except Exception as e:
            logger.error("Meta API exception (attempt %s/2): %s", attempt + 1, e)
            if attempt == 0:
                await asyncio.sleep(1.0)

    return False


async def send_whatsapp_image(
    business: dict,
    to_phone: str,
    image_url: str,
    caption: str = "",
    *,
    reply_channel: str | None = None,
) -> bool:
    """Send image with optional caption via Meta or Twilio."""
    provider = (reply_channel or _resolve_provider(business)).lower()
    strict = reply_channel is not None

    if provider == "meta":
        ok = await _send_image_via_meta(to_phone, image_url, caption)
        if ok or strict:
            return ok
        return await _send_image_via_twilio(to_phone, image_url, caption)

    ok = await _send_image_via_twilio(to_phone, image_url, caption)
    if ok or strict:
        return ok
    return await _send_image_via_meta(to_phone, image_url, caption)


async def _send_image_via_meta(to_phone: str, image_url: str, caption: str) -> bool:
    if not settings.meta_phone_number_id or not settings.meta_whatsapp_token:
        return False
    version = settings.meta_graph_api_version.lstrip("v")
    url = f"https://graph.facebook.com/v{version}/{settings.meta_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.meta_whatsapp_token}",
        "Content-Type": "application/json",
    }
    payload: dict = {
        "messaging_product": "whatsapp",
        "to": _digits_only(to_phone),
        "type": "image",
        "image": {"link": image_url},
    }
    if caption:
        payload["image"]["caption"] = caption[:1024]

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            resp = await http_client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                logger.info("Meta image sent to %s", to_phone)
                return True
            logger.error("Meta image error: %s %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("Meta image exception: %s", e)
    return False


async def _send_image_via_twilio(to_phone: str, image_url: str, caption: str) -> bool:
    if not settings.twilio_whatsapp_number:
        return False
    try:
        client = _get_twilio_client()
        client.messages.create(
            from_=_from_twilio_whatsapp(),
            to=_to_whatsapp_address(to_phone),
            body=caption or None,
            media_url=[image_url],
        )
        logger.info("Twilio image sent to %s", to_phone)
        return True
    except Exception as e:
        logger.error("Twilio image error: %s", e)
    return False
