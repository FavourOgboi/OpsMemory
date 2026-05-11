"""
OpsMemory — Collections Agent

Monitors outstanding balances and drafts tone-calibrated follow-up messages.
Fully agentic: Creates campaigns to track multi-step collection attempts.

Tone escalates based on days overdue:
- 1-3 days: gentle nudge
- 4-7 days: firm reminder
- 8-14 days: serious follow-up
- 14+ days: escalate to CEO

Campaign flow:
Step 1: Send gentle reminder, wait 48h
Step 2: If no payment, send firmer follow-up, wait 48h
Step 3: If still no payment, escalate to CEO with context

If payment arrives at any step, close campaign with outcome.
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.services.campaign_manager import CampaignManager
from openai import AsyncOpenAI
from app.config import settings
from typing import Dict, List, Optional
from datetime import datetime, timezone

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

    async def start_campaign(
        self,
        business_id: str,
        customer: Dict,
        outstanding: float,
        days_overdue: int,
    ) -> str:
        """
        Start a multi-step collection campaign.
        Called after initial message is approved and sent.

        Returns: campaign_id
        """
        campaign_id = await CampaignManager.create_campaign(
            business_id=business_id,
            customer_id=customer["id"],
            agent_name="Collections",
            goal="collect_payment",
            max_steps=3,
            initial_context={
                "outstanding_amount": outstanding,
                "days_overdue_at_start": days_overdue,
                "customer_name": customer.get("name"),
                "language": customer.get("language", "english"),
                "initial_message_sent_at": datetime.now(timezone.utc).isoformat(),
                "step_1_tone": self._get_tone(days_overdue),
            },
            check_interval_hours=48,  # Check in 48 hours
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
        Evaluates outcomes and decides the next step.
        """
        step = campaign["current_step"]
        context = campaign.get("context", {})
        outstanding = context.get("outstanding_amount", 0)
        language = context.get("language", "english")

        # ────────────────────────────────────────────────────────────────────
        # STEP 1: Check if payment has arrived
        # ────────────────────────────────────────────────────────────────────
        goal_achieved = await self._check_payment_received(
            customer=customer,
            messages=recent_messages,
            outstanding=outstanding,
        )

        if goal_achieved:
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="goal_achieved",
                reasoning="Payment confirmation detected in conversation.",
            )
            await CampaignManager.log_campaign_decision(
                campaign_id=campaign["id"],
                business_id=business_id,
                step_number=step,
                action_taken="payment_received",
                customer_signal="payment_confirmation",
                reasoning="Campaign goal achieved. Payment received.",
            )
            return

        # ────────────────────────────────────────────────────────────────────
        # STEP 2: Decide next action based on current step
        # ────────────────────────────────────────────────────────────────────
        if step == 1:
            # First reminder sent, waiting 48h. Now send firmer follow-up.
            await self._send_step_2_followup(
                business_id=business_id,
                customer=customer,
                campaign_id=campaign["id"],
                outstanding=outstanding,
                language=language,
                context=context,
            )

        elif step == 2:
            # Second follow-up sent, waiting 48h. If still no payment, escalate.
            await self._escalate_to_ceo(
                business_id=business_id,
                customer=customer,
                campaign_id=campaign["id"],
                outstanding=outstanding,
                context=context,
            )

        elif step >= 3:
            # Should have been handled already
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="escalated",
                reasoning="Max steps reached. Escalated to CEO.",
            )

    async def _check_payment_received(
        self,
        customer: Dict,
        messages: List[Dict],
        outstanding: float,
    ) -> bool:
        """
        Check if payment confirmation arrived in recent messages.
        Looks for patterns: payment, sent, confirmed, receipt, etc.
        """
        if not messages:
            return False

        # Get recent customer messages (last 10)
        recent_customer_msgs = [
            m for m in messages[-10:] if m.get("direction") == "inbound"
        ]

        for msg in recent_customer_msgs:
            content = msg.get("content", "").lower()
            # Simple heuristic: look for payment confirmation keywords
            if any(
                keyword in content
                for keyword in [
                    "sent",
                    "paid",
                    "confirm",
                    "receipt",
                    "transfer",
                    "pay",
                ]
            ):
                # In production, would parse the amount to verify
                return True

        return False

    async def _send_step_2_followup(
        self,
        business_id: str,
        customer: Dict,
        campaign_id: str,
        outstanding: float,
        language: str,
        context: Dict,
    ) -> None:
        """Send firmer follow-up message (Step 2)."""
        # Generate firmer tone message
        prompt = f"""
You are the Collections Agent for a Nigerian business.
This is a SECOND follow-up message about an overdue invoice.
The first reminder was sent 48 hours ago. Still no payment.

Make this message more serious and action-oriented. Include the amount.
Keep it under 100 words. Tone: Professional but urgent.

Customer: {customer.get('name')}
Amount: ₦{outstanding:,.0f}
Language: {language}

Return ONLY the WhatsApp message. No explanation.
"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.6,
        )

        step_2_message = response.choices[0].message.content.strip()

        # Create agent action to send this message
        from app.services.agents.base_agent import BaseAgent

        agent = BaseAgent()
        await agent.propose_action(
            customer=customer,
            trigger_summary=f"Step 2: Second collection reminder. {outstanding:,.0f} still outstanding.",
            proposed_action="Send firmer follow-up message via WhatsApp.",
            proposed_message=step_2_message,
            risk_level="high",
            confidence=0.89,
            track="assign",
        )

        # Advance campaign
        await CampaignManager.advance_campaign_step(
            campaign_id=campaign_id,
            next_check_at_hours=48,
            context_update={"step_2_message_sent_at": datetime.now(timezone.utc).isoformat()},
        )

        await CampaignManager.log_campaign_decision(
            campaign_id=campaign_id,
            business_id=business_id,
            step_number=2,
            action_taken="sent_firmer_followup",
            reasoning="First reminder had no response. Escalating tone.",
            customer_signal="no_response",
        )

    async def _escalate_to_ceo(
        self,
        business_id: str,
        customer: Dict,
        campaign_id: str,
        outstanding: float,
        context: Dict,
    ) -> None:
        """Escalate to CEO if no response by Step 3."""
        # Get campaign history for full context
        history = await CampaignManager.get_campaign_history(campaign_id)

        escalation_context = {
            "customer_name": customer.get("name"),
            "customer_phone": customer.get("phone"),
            "outstanding_amount": outstanding,
            "days_overdue": context.get("days_overdue_at_start", 0) + 4,  # ~4 more days have passed
            "campaign_steps_taken": len(history),
            "attempts_made": 2,
            "response_received": False,
            "business_name": customer.get("business_name", "N/A"),
        }

        recommendation = f"""
Payment not received after 2 automated reminders.
Options:
1. Send personal call via Twilio (Recommended for high-value customers >₦500k lifetime)
2. Route to CEO for manual negotiation
3. Mark as recovered later and reduce contact frequency
"""

        await CampaignManager.escalate_campaign(
            campaign_id=campaign_id,
            escalation_reason="No payment received after 2 automated attempts. Requires CEO decision.",
            recommendation=recommendation,
        )

        await CampaignManager.log_campaign_decision(
            campaign_id=campaign_id,
            business_id=business_id,
            step_number=3,
            action_taken="escalated_to_ceo",
            reasoning="Two follow-ups sent with no response. Requires human judgment.",
            agent_evaluation={
                "confidence": 0.75,
                "risk_level": "high",
                "next_step_recommendation": recommendation,
                "context": escalation_context,
            },
        )

    @staticmethod
    def _get_tone(days_overdue: int) -> str:
        """Determine message tone based on days overdue."""
        if days_overdue <= 3:
            return "gentle_nudge"
        elif days_overdue <= 7:
            return "firm_reminder"
        elif days_overdue <= 14:
            return "serious_followup"
        else:
            return "urgent_escalation"
