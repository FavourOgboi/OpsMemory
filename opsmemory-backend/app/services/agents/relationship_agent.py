"""
OpsMemory — Relationship Health Agent

Monitors the overall health of customer relationships by analyzing:
- Sentiment trends across recent messages
- Complaint patterns
- Communication gaps
- Customer satisfaction signals

Proposes relationship interventions when health deteriorates.
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.database import supabase
from typing import Dict, List


class RelationshipHealthAgent(BaseAgent):
    name = "Relationship Health Agent"
    color = "#0EA5E9"

    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        health_score = customer.get("health_score", 80)
        total_revenue = customer.get("total_revenue", 0)

        # Only monitor customers with meaningful history
        if total_revenue < 30000:
            return

        # Skip if pending action already exists
        if await self._has_pending(customer["id"]):
            return

        # ── Trigger 1: Active complaint ─────────────────────────────────────
        if extracted.intent == "complaint" and extracted.sentiment in [
            "negative",
            "urgent",
        ]:
            # Drop health score on complaint
            new_health = max(health_score - 20, 0)
            supabase.table("customers").update({
                "health_score": new_health,
            }).eq("id", customer["id"]).eq("business_id", self.business_id).execute()

            severity = "high" if extracted.sentiment == "urgent" else "medium"

            await self.propose_action(
                customer=customer,
                trigger_summary=(
                    f"{customer.get('name')} raised a {extracted.sentiment} complaint. "
                    f"Health score dropped from {health_score} to {new_health}. "
                    f"Sentiment: {extracted.sentiment}."
                ),
                proposed_action=(
                    f"Immediately address {customer.get('name')}'s complaint. "
                    f"Assign a senior team member for resolution. "
                    f"Follow up within 24 hours to confirm satisfaction."
                ),
                proposed_message=(
                    f"Hi {customer.get('name', 'there')}, we're really sorry to hear about "
                    f"this issue. I'm personally looking into it right now and will have an "
                    f"update for you very soon. Your satisfaction is our priority."
                ),
                risk_level=severity,
                confidence=0.92,
                track="assign" if severity == "medium" else "escalate",
            )
            return

        # ── Trigger 2: Health score critically low ──────────────────────────
        if health_score <= 30 and total_revenue > 100000:
            await self.propose_action(
                customer=customer,
                trigger_summary=(
                    f"{customer.get('name')}'s relationship health score is critically "
                    f"low at {health_score}/100. Lifetime value: ₦{total_revenue:,.0f}. "
                    f"Immediate intervention needed."
                ),
                proposed_action=(
                    f"Schedule a personal call with {customer.get('name')} from management. "
                    f"Review their recent experience and resolve any outstanding issues. "
                    f"Consider a goodwill gesture to rebuild trust."
                ),
                proposed_message=(
                    f"Hi {customer.get('name', 'there')}, I wanted to personally reach out "
                    f"and check in with you. We value your business greatly and want to make "
                    f"sure everything is going smoothly. Would you have a few minutes to chat?"
                ),
                risk_level="high",
                confidence=0.88,
                track="escalate",
            )
            return

        # ── Trigger 3: Negative sentiment pattern ───────────────────────────
        if len(messages) >= 3:
            negative_count = sum(
                1
                for msg in messages[-5:]
                if msg.get("extracted_data", {})
                and msg["extracted_data"].get("sentiment") in ["negative", "urgent"]
            )
            if negative_count >= 2:
                await self.propose_action(
                    customer=customer,
                    trigger_summary=(
                        f"{customer.get('name')} has shown negative sentiment in "
                        f"{negative_count} of their last 5 messages. "
                        f"Relationship may be deteriorating."
                    ),
                    proposed_action=(
                        f"Proactively reach out to {customer.get('name')} to address "
                        f"their concerns before the relationship deteriorates further."
                    ),
                    proposed_message=(
                        f"Hi {customer.get('name', 'there')}, just wanted to check in "
                        f"and make sure everything is alright. If there's anything we can "
                        f"do better, please don't hesitate to let us know!"
                    ),
                    risk_level="medium",
                    confidence=0.78,
                    track="assign",
                )
