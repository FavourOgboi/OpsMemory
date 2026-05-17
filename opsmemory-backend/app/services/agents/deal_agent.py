"""
OpsMemory — Deal Intelligence Agent

Activates when a deal_negotiation intent is detected with an amount
above the business's deal_approval_threshold.
Generates a concise CEO briefing via premium model and always uses the 'escalate' track.

Campaign flow:
Step 1: Propose CEO briefing + escalate (already done in evaluate)
Step 2: If CEO approved but customer hasn't replied, propose follow-up message
Step 3: If still no reply, propose final-close message or mark as lost
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.services.llm_client import get_llm_client, resolve_model
from app.services.campaign_manager import CampaignManager
from typing import Dict, List
from datetime import datetime, timezone

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

        # Build CEO brief using premium model (worth the cost for high-value deals)
        client = get_llm_client("premium")
        response = await client.chat.completions.create(
            model=resolve_model("premium"),
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

    async def start_campaign(
        self,
        business_id: str,
        customer: Dict,
        deal_amount: float,
    ) -> str:
        """
        Start a multi-step deal closing campaign.
        Called after initial CEO briefing is approved.
        """
        campaign_id = await CampaignManager.create_campaign(
            business_id=business_id,
            customer_id=customer["id"],
            agent_name="Deal",
            goal="close_deal",
            max_steps=3,
            initial_context={
                "deal_amount": deal_amount,
                "customer_name": customer.get("name"),
                "language": customer.get("language", "english"),
                "initial_brief_sent_at": datetime.now(timezone.utc).isoformat(),
            },
            check_interval_hours=48,
        )
        return campaign_id

    async def continue_campaign(
        self,
        business_id: str,
        campaign: Dict,
        customer: Dict,
        recent_messages: List[Dict],
    ) -> None:
        """
        Called by scheduler when campaign's next_check_at arrives.
        Evaluates whether customer replied with acceptance, counter-offer, or silence.
        """
        step = campaign["current_step"]
        context = campaign.get("context", {})
        language = context.get("language", "english")
        deal_amount = context.get("deal_amount", 0)

        # Check for customer reply signals
        customer_signal = self._evaluate_customer_reply(recent_messages)

        if customer_signal == "accepted":
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="goal_achieved",
                reasoning="Customer accepted the deal terms.",
            )
            await CampaignManager.log_campaign_decision(
                campaign_id=campaign["id"],
                business_id=business_id,
                step_number=step,
                action_taken="deal_closed",
                customer_signal="accepted",
                reasoning="Deal successfully closed.",
            )
            return
        elif customer_signal == "rejected":
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="customer_rejected",
                reasoning="Customer explicitly rejected the deal.",
            )
            await CampaignManager.log_campaign_decision(
                campaign_id=campaign["id"],
                business_id=business_id,
                step_number=step,
                action_taken="deal_rejected",
                customer_signal="rejected",
                reasoning="Customer declined the deal.",
            )
            return

        if step == 1:
            await self._send_step_2_followup(
                business_id=business_id,
                customer=customer,
                campaign_id=campaign["id"],
                language=language,
                deal_amount=deal_amount,
                context=context,
            )
        elif step == 2:
            await self._send_final_close(
                business_id=business_id,
                customer=customer,
                campaign_id=campaign["id"],
                language=language,
                deal_amount=deal_amount,
                context=context,
            )
        elif step >= 3:
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="timeout",
                reasoning="Max steps reached. No response from customer.",
            )

    def _evaluate_customer_reply(self, messages: List[Dict]) -> str:
        """Evaluate recent messages for acceptance, rejection, or silence."""
        if not messages:
            return "silence"
        accept_keywords = ["yes", "okay", "deal", "agree", "accept", "sounds good", "go ahead", "send"]
        reject_keywords = ["no", "too expensive", "cancel", "not interested", "reject", "pass", "maybe later"]
        for msg in reversed(messages[-5:]):
            content = msg.get("content", "").lower()
            if any(kw in content for kw in accept_keywords):
                return "accepted"
            if any(kw in content for kw in reject_keywords):
                return "rejected"
        return "silence"

    async def _send_step_2_followup(
        self,
        business_id: str,
        customer: Dict,
        campaign_id: str,
        language: str,
        deal_amount: float,
        context: Dict,
    ) -> None:
        """Send follow-up if CEO approved but customer hasn't replied (Step 2)."""
        prompt = f"""
You are the Deal Intelligence Agent for a Nigerian business.
The CEO approved a deal of ₦{deal_amount:,.0f} for {customer.get('name')} but they haven't responded yet.
Draft a gentle follow-up WhatsApp message to keep the conversation warm.
Keep it under 60 words.

Language: {language}

Return ONLY the WhatsApp message. No explanation.
"""
        client = get_llm_client("cheap")
        response = await client.chat.completions.create(
            model=resolve_model("cheap"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.6,
        )
        followup_message = response.choices[0].message.content.strip()

        await self.propose_action(
            customer=customer,
            trigger_summary=f"Step 2: Deal follow-up for {customer.get('name')} (₦{deal_amount:,.0f}).",
            proposed_action="Send deal follow-up message via WhatsApp.",
            proposed_message=followup_message,
            risk_level="medium",
            confidence=0.82,
            track="assign",
        )

        await CampaignManager.advance_campaign_step(
            campaign_id=campaign_id,
            next_check_at_hours=48,
            context_update={"step_2_followup_sent_at": datetime.now(timezone.utc).isoformat()},
        )

        await CampaignManager.log_campaign_decision(
            campaign_id=campaign_id,
            business_id=business_id,
            step_number=2,
            action_taken="sent_deal_followup",
            reasoning="CEO approved but customer has not replied. Sending follow-up.",
            customer_signal="silence",
        )

    async def _send_final_close(
        self,
        business_id: str,
        customer: Dict,
        campaign_id: str,
        language: str,
        deal_amount: float,
        context: Dict,
    ) -> None:
        """Send final-close message or mark as lost (Step 3)."""
        prompt = f"""
You are the Deal Intelligence Agent for a Nigerian business.
This is the FINAL follow-up for a deal of ₦{deal_amount:,.0f} with {customer.get('name')}.
Draft a polite closing message — let them know this is the last follow-up and the door remains open.
Keep it under 60 words.

Language: {language}

Return ONLY the WhatsApp message. No explanation.
"""
        client = get_llm_client("cheap")
        response = await client.chat.completions.create(
            model=resolve_model("cheap"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.5,
        )
        final_message = response.choices[0].message.content.strip()

        await self.propose_action(
            customer=customer,
            trigger_summary=f"Step 3: Final close for {customer.get('name')} deal (₦{deal_amount:,.0f}).",
            proposed_action="Send final close message or mark deal as lost.",
            proposed_message=final_message,
            risk_level="low",
            confidence=0.78,
            track="assign",
        )

        await CampaignManager.advance_campaign_step(
            campaign_id=campaign_id,
            next_check_at_hours=48,
            context_update={"step_3_final_close_sent_at": datetime.now(timezone.utc).isoformat()},
        )

        await CampaignManager.log_campaign_decision(
            campaign_id=campaign_id,
            business_id=business_id,
            step_number=3,
            action_taken="sent_final_close",
            reasoning="Two follow-ups sent with no response. Final close attempt.",
            customer_signal="silence",
        )
