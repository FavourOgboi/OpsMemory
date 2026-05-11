"""
OpsMemory — Deal Intelligence Agent

Activates when a deal_negotiation intent is detected with an amount
above the business's deal_approval_threshold.
Generates a concise CEO briefing via GPT-4o and always uses the 'escalate' track.
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from openai import AsyncOpenAI
from app.config import settings
from typing import Dict, List

client = AsyncOpenAI(api_key=settings.openai_api_key)

DEAL_BRIEF_PROMPT = """
You are the Deal Intelligence Agent. Assemble a CEO briefing for a deal request.
Be concise. The CEO is busy. The brief must be scannable in 30 seconds.

Customer: {customer_name}
Total lifetime revenue: ₦{lifetime_revenue}
Deal amount: ₦{deal_amount}
Discount requested: {discount_requested}
Customer payment behaviour: {payment_score}/100
Churn risk: {churn_risk}
Outstanding balance: ₦{outstanding}

Write a brief covering:
1. Who this customer is (1 sentence)
2. The deal being proposed (1 sentence)
3. Risk assessment (1 sentence)
4. Your recommendation (1 sentence)
5. Suggested counter-offer if discount is too high (1 sentence)

Return as plain text, no headers, no bullet points. 5 sentences max.
"""


class DealAgent(BaseAgent):
    name = "Deal Intelligence Agent"
    color = "#D97706"

    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        threshold = self.business.get("deal_approval_threshold", 100000)

        # Only activate for deal_negotiation intent with a significant amount
        if extracted.intent != "deal_negotiation":
            return
        if not extracted.amount or extracted.amount < threshold:
            return

        # Build CEO brief using GPT-4o (worth the cost for high-value deals)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": DEAL_BRIEF_PROMPT.format(
                        customer_name=customer.get("name"),
                        lifetime_revenue=f"{customer.get('total_revenue', 0):,.0f}",
                        deal_amount=f"{extracted.amount:,.0f}",
                        discount_requested=(
                            "Not specified"
                            if not extracted.amount
                            else "Negotiating"
                        ),
                        payment_score=customer.get("payment_behavior_score", 70),
                        churn_risk=customer.get("churn_risk", "low"),
                        outstanding=f"{customer.get('outstanding_balance', 0):,.0f}",
                    ),
                }
            ],
            max_tokens=200,
            temperature=0.3,
        )
        ceo_brief = response.choices[0].message.content.strip()

        await self.propose_action(
            customer=customer,
            trigger_summary=(
                f"Deal request of ₦{extracted.amount:,.0f} from "
                f"{customer.get('name')} requires CEO approval."
            ),
            proposed_action=ceo_brief,
            proposed_message=None,  # CEO decides the response
            risk_level=(
                "high" if extracted.amount > threshold * 2 else "medium"
            ),
            confidence=0.88,
            track="escalate",
        )
