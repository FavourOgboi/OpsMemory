"""
OpsMemory — Collections Agent

Monitors outstanding balances and drafts tone-calibrated follow-up messages.
Tone escalates based on days overdue:
- 1-3 days: gentle nudge
- 4-7 days: firm reminder
- 8-14 days: serious follow-up
- 14+ days: escalate to CEO
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from openai import AsyncOpenAI
from app.config import settings
from typing import Dict, List

client = AsyncOpenAI(api_key=settings.openai_api_key)

COLLECTIONS_PROMPT = """
You are the Collections Agent for a Nigerian business.
A customer has an overdue invoice. Draft a WhatsApp follow-up message.

Rules:
- Tone must match days overdue: 1-3 days = gentle, 4-7 days = firm, 8-14 days = serious
- Write in the customer's language: {language}
- Refer to the customer by name
- Mention the amount only if days overdue >= 4
- Keep it under 80 words
- Sound human, not automated

Customer: {customer_name}
Days overdue: {days_overdue}
Amount outstanding: ₦{amount}
Language: {language}
Previous contact: {previous_contact}

Return ONLY the WhatsApp message text. No quotes. No explanation.
"""


class CollectionsAgent(BaseAgent):
    name = "Collections Agent"
    color = "#1A56DB"

    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        outstanding = customer.get("outstanding_balance", 0)
        if outstanding <= 0:
            return

        # Below ₦10k — not worth agent action
        if outstanding < 10000:
            return

        # Skip if we already have a pending action for this customer
        if await self._has_pending(customer["id"]):
            return

        days_overdue = customer.get("days_since_last_order", 0)

        # Draft the follow-up message
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": COLLECTIONS_PROMPT.format(
                        customer_name=customer.get("name", "Customer"),
                        days_overdue=days_overdue,
                        amount=f"{outstanding:,.0f}",
                        language=customer.get("language", "english"),
                        previous_contact=(
                            "No recent contact"
                            if days_overdue > 7
                            else "Recent conversation"
                        ),
                    ),
                }
            ],
            max_tokens=150,
            temperature=0.6,
        )
        draft_message = response.choices[0].message.content.strip()

        risk = (
            "low" if days_overdue <= 3
            else "medium" if days_overdue <= 7
            else "high"
        )
        track = "assign" if days_overdue < 14 else "escalate"

        await self.propose_action(
            customer=customer,
            trigger_summary=(
                f"Invoice overdue by approximately {days_overdue} days. "
                f"Outstanding: ₦{outstanding:,.0f}"
            ),
            proposed_action=(
                f"Send payment follow-up to {customer.get('name')} via WhatsApp."
            ),
            proposed_message=draft_message,
            risk_level=risk,
            confidence=0.91,
            track=track,
        )
