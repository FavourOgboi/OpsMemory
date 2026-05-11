"""
OpsMemory — Revenue Pulse Agent

Monitors revenue patterns and flags anomalies:
- Revenue dips: significant drop in a customer's order values
- Upsell opportunities: customers with growing order patterns
- Payment consistency: tracks payment reliability trends

Runs on both message triggers and scheduled sweeps.
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.database import supabase
from typing import Dict, List


class RevenuePulseAgent(BaseAgent):
    name = "Revenue Pulse Agent"
    color = "#E11D48"

    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        total_revenue = customer.get("total_revenue", 0)
        outstanding = customer.get("outstanding_balance", 0)
        payment_score = customer.get("payment_behavior_score", 70)

        # Skip low-value customers
        if total_revenue < 100000:
            return

        # Skip if pending action already exists
        if await self._has_pending(customer["id"]):
            return

        # ── Trigger 1: Payment reliability declining ────────────────────────
        if payment_score < 40 and outstanding > 50000:
            await self.propose_action(
                customer=customer,
                trigger_summary=(
                    f"{customer.get('name')}'s payment behaviour score is {payment_score}/100 "
                    f"with ₦{outstanding:,.0f} outstanding. Reliability is declining."
                ),
                proposed_action=(
                    f"Review credit terms for {customer.get('name')}. Consider requiring "
                    f"partial upfront payment on next order. Their payment score is "
                    f"{payment_score}/100."
                ),
                proposed_message=None,  # Internal action only
                risk_level="high",
                confidence=0.82,
                track="escalate",
            )
            return

        # ── Trigger 2: High-value customer at churn risk ────────────────────
        if (
            total_revenue > 500000
            and customer.get("churn_risk") in ["high", "critical"]
        ):
            await self.propose_action(
                customer=customer,
                trigger_summary=(
                    f"High-value customer {customer.get('name')} "
                    f"(₦{total_revenue:,.0f} lifetime) is at {customer.get('churn_risk')} "
                    f"churn risk. Revenue impact would be significant."
                ),
                proposed_action=(
                    f"Prioritize retention for {customer.get('name')}. Consider offering "
                    f"a loyalty discount or personal outreach from management."
                ),
                proposed_message=(
                    f"Hi {customer.get('name', 'there')}, you're one of our most valued "
                    f"customers and we'd love to discuss how we can serve you even better. "
                    f"Would you have time for a quick call this week?"
                ),
                risk_level="high",
                confidence=0.85,
                track="escalate",
            )
            return

        # ── Trigger 3: Upsell opportunity — payment claim on time ──────────
        if (
            extracted.intent == "payment_claim"
            and payment_score >= 80
            and total_revenue > 200000
        ):
            await self.propose_action(
                customer=customer,
                trigger_summary=(
                    f"{customer.get('name')} just claimed a payment. They have a strong "
                    f"payment score ({payment_score}/100) and ₦{total_revenue:,.0f} lifetime "
                    f"value. Good candidate for upsell."
                ),
                proposed_action=(
                    f"After confirming payment, offer {customer.get('name')} a bulk "
                    f"discount or introduce premium product lines."
                ),
                proposed_message=None,
                risk_level="low",
                confidence=0.72,
                track="assign",
            )
