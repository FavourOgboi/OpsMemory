"""
OpsMemory — Churn Detection Agent

Detects customers who have gone silent beyond their normal order frequency.
Updates churn_risk and health_score in the database.
Only flags customers with meaningful history (>₦50k lifetime revenue).
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.database import supabase
from typing import Dict, List


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
