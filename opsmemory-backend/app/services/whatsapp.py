"""
OpsMemory — WhatsApp Message Sender

Dual-path sender: Twilio sandbox for development, Meta Business API for production.
Each business has its own WhatsApp configuration — messages are sent from the
business's registered number, not a shared platform number.
"""

import httpx
from twilio.rest import Client as TwilioClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

twilio_client = TwilioClient(
    settings.twilio_account_sid,
    settings.twilio_auth_token,
)


async def send_whatsapp_message(
    business: dict,
    to_phone: str,
    message: str,
) -> bool:
    """
    Sends a WhatsApp message on behalf of a business.
    Uses Twilio sandbox in development, Meta Business API in production.
    """
    if settings.app_env == "development":
        return await _send_via_twilio(to_phone, message)
    else:
        return await _send_via_meta(business, to_phone, message)


async def _send_via_twilio(to_phone: str, message: str) -> bool:
    """Send via Twilio WhatsApp sandbox (development only)."""
    try:
        twilio_client.messages.create(
            body=message,
            from_=settings.twilio_whatsapp_number,
            to=f"whatsapp:{to_phone}",
        )
        logger.info(f"Twilio message sent to {to_phone}")
        return True
    except Exception as e:
        logger.error(f"Twilio send error: {e}")
        return False


async def _send_via_meta(business: dict, to_phone: str, message: str) -> bool:
    """Send via Meta WhatsApp Business API (production)."""
    url = f"https://graph.facebook.com/v19.0/{settings.meta_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.meta_whatsapp_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone.replace("+", "").replace(" ", ""),
        "type": "text",
        "text": {"body": message},
    }
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            logger.error(f"Meta API error: {resp.text}")
            return False
    logger.info(f"Meta message sent to {to_phone}")
    return True
