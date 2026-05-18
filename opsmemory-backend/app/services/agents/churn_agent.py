"""
OpsMemory — Churn Detection Agent

Detects customers who have gone silent beyond their normal order frequency.
Updates churn_risk and health_score in the database.
Only flags customers with meaningful history (>₦50k lifetime revenue).

Campaign flow:
Step 1: Propose warm re-engagement message, wait 72h
Step 2: If no order, propose stronger offer (discount/free delivery), wait 72h
Step 3: If still no order, escalate to CEO with full history
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.database import supabase
from app.services.campaign_manager import CampaignManager
from app.services.llm_client import get_llm_client, resolve_model
from typing import Dict, List
from datetime import datetime, timezone


class ChurnAgent(BaseAgent):
    name = "Churn Detection Agent"
    color = "#7C3AED"

    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        days_silent = customer.get("days_since_last_order", 0)
        frequency = customer.get("order_frequency_days", 10)
        health_score = customer.get("health_score", 80)
        total_revenue = customer.get("total_revenue", 0)

        # Only flag customers with meaningful history
        if total_revenue < 50000 or frequency == 0:
            return

        # Churn threshold: silent for 1.5x their normal order frequency
        threshold = frequency * 1.5
        if days_silent < threshold:
            return

        # Skip if we already have a pending churn action
        if await self._has_pending(customer["id"]):
            return

        churn_risk = "medium" if days_silent < frequency * 2.5 else "high"

        # Update customer churn risk in DB (scoped by business_id)
        supabase.table("customers").update({
            "churn_risk": churn_risk,
            "health_score": max(health_score - 15, 0),
        }).eq("id", customer["id"]).eq("business_id", self.business_id).execute()

        await self.propose_action(
            customer=customer,
            trigger_summary=(
                f"{customer.get('name')} has not ordered in {days_silent} days. "
                f"Their usual cycle is {frequency} days. "
                f"Health score dropped to {max(health_score - 15, 0)}."
            ),
            proposed_action=(
                f"Send a re-engagement message to {customer.get('name')} "
                f"before churn becomes likely."
            ),
            proposed_message=(
                f"Hi {customer.get('name', 'there')}, hope business is going well! "
                f"We noticed you haven't placed an order recently. "
                f"We have fresh stock available — want us to prepare something for you this week?"
            ),
            risk_level=churn_risk,
            confidence=0.84,
            track="assign",
        )

    async def start_campaign(
        self,
        business_id: str,
        customer: Dict,
        days_silent: int,
        frequency: int,
    ) -> str:
        """
        Start a multi-step churn recovery campaign.
        Called after initial re-engagement message is approved and sent.
        """
        campaign_id = await CampaignManager.create_campaign(
            business_id=business_id,
            customer_id=customer["id"],
            agent_name="Churn",
            goal="recover_churning_customer",
            max_steps=3,
            initial_context={
                "days_silent": days_silent,
                "frequency": frequency,
                "customer_name": customer.get("name"),
                "language": customer.get("language", "english"),
                "initial_message_sent_at": datetime.now(timezone.utc).isoformat(),
            },
            check_interval_hours=72,
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
        language = context.get("language", "english")

        # Check if customer placed an order or replied positively
        goal_achieved = self._check_order_or_positive_reply(recent_messages)
        if goal_achieved:
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="goal_achieved",
                reasoning="Customer placed an order or replied positively.",
            )
            await CampaignManager.log_campaign_decision(
                campaign_id=campaign["id"],
                business_id=business_id,
                step_number=step,
                action_taken="customer_re_engaged",
                customer_signal="order_or_positive_reply",
                reasoning="Churn recovery successful.",
            )
            return

        if step == 1:
            await self._send_step_2_offer(
                business_id=business_id,
                customer=customer,
                campaign_id=campaign["id"],
                language=language,
                context=context,
            )
        elif step == 2:
            await self._escalate_to_ceo(
                business_id=business_id,
                customer=customer,
                campaign_id=campaign["id"],
                context=context,
            )
        elif step >= 3:
            await CampaignManager.close_campaign(
                campaign_id=campaign["id"],
                outcome="escalated",
                reasoning="Max steps reached. Escalated to CEO.",
            )

    def _check_order_or_positive_reply(self, messages: List[Dict]) -> bool:
        """Check if recent messages indicate an order or positive reply."""
        if not messages:
            return False
        positive_keywords = ["order", "send", "buy", "purchase", "yes", "okay", "great", "thanks", "appreciate"]
        for msg in messages[-5:]:
            content = msg.get("content", "").lower()
            if any(kw in content for kw in positive_keywords):
                return True
        return False

    async def _send_step_2_offer(
        self,
        business_id: str,
        customer: Dict,
        campaign_id: str,
        language: str,
        context: Dict,
    ) -> None:
        """Send stronger offer (Step 2) with discount or free delivery."""
        prompt = f"""
You are the Churn Detection Agent for a Nigerian business.
This is a SECOND re-engagement attempt. The customer did not respond to the first message.
Propose a stronger offer — mention a small discount or free delivery to win them back.
Keep it warm, personal, and under 80 words.

Customer: {customer.get('name')}
Language: {language}

Return ONLY the WhatsApp message. No explanation.
"""
        client = get_llm_client("cheap")
        response = await client.chat.completions.create(
            model=resolve_model("cheap"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7,
        )
        step_2_message = response.choices[0].message.content.strip()

        await self.propose_action(
            customer=customer,
            trigger_summary=f"Step 2: Stronger re-engagement offer for {customer.get('name')}.",
            proposed_action="Send win-back offer via WhatsApp (discount or free delivery).",
            proposed_message=step_2_message,
            risk_level="high",
            confidence=0.86,
            track="assign",
        )

        await CampaignManager.advance_campaign_step(
            campaign_id=campaign_id,
            next_check_at_hours=72,
            context_update={"step_2_message_sent_at": datetime.now(timezone.utc).isoformat()},
        )

        await CampaignManager.log_campaign_decision(
            campaign_id=campaign_id,
            business_id=business_id,
            step_number=2,
            action_taken="sent_win_back_offer",
            reasoning="First re-engagement had no response. Escalating offer.",
            customer_signal="no_response",
        )

    async def _escalate_to_ceo(
        self,
        business_id: str,
        customer: Dict,
        campaign_id: str,
        context: Dict,
    ) -> None:
        """Escalate to CEO if no response by Step 3."""
        days_silent = context.get("days_silent", 0)
        frequency = context.get("frequency", 10)
        recommendation = (
            f"{customer.get('name')} has been silent for {days_silent} days "
            f"(normal cycle: {frequency} days). Two re-engagement attempts sent with no response. "
            f"Recommend: personal call from management or special loyalty offer."
        )

        await CampaignManager.escalate_campaign(
            campaign_id=campaign_id,
            escalation_reason="No response after 2 automated re-engagement attempts.",
            recommendation=recommendation,
        )

        await CampaignManager.log_campaign_decision(
            campaign_id=campaign_id,
            business_id=business_id,
            step_number=3,
            action_taken="escalated_to_ceo",
            reasoning="Two re-engagement messages sent with no response. Requires human judgment.",
            agent_evaluation={
                "confidence": 0.80,
                "risk_level": "high",
                "next_step_recommendation": recommendation,
            },
        )
