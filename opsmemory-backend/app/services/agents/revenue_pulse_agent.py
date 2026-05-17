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
from app.database import supabase, insert_event
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

        # ── Trigger 4 (sweep only): Revenue trajectory drop ────────────────
        # This is handled at business level in scheduled sweeps via _check_business_revenue

    async def check_business_revenue_health(self, business_id: str) -> None:
        """
        Business-level revenue trajectory check. Called by scheduler sweeps.
        Compares this month's paid orders vs last month.
        """
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

        this_month_orders = supabase.table("orders") \
            .select("total") \
            .eq("business_id", business_id) \
            .gte("created_at", this_month_start.isoformat()) \
            .eq("status", "paid") \
            .execute()

        last_month_orders = supabase.table("orders") \
            .select("total") \
            .eq("business_id", business_id) \
            .gte("created_at", last_month_start.isoformat()) \
            .lt("created_at", this_month_start.isoformat()) \
            .eq("status", "paid") \
            .execute()

        this_month_revenue = sum(o.get("total", 0) for o in this_month_orders.data)
        last_month_revenue = sum(o.get("total", 0) for o in last_month_orders.data)

        if last_month_revenue > 0:
            drop_pct = (last_month_revenue - this_month_revenue) / last_month_revenue
            if drop_pct > 0.20:
                await self._log_revenue_warning(business_id, this_month_revenue, last_month_revenue, drop_pct)

    async def check_pipeline_health(self, business_id: str, threshold: int = 3) -> None:
        """
        Check for thin pipeline: customers with open conversations but no order in 14 days.
        Called by scheduler sweeps.
        """
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

        # Customers with open conversations
        convs = supabase.table("conversations") \
            .select("customer_id") \
            .eq("business_id", business_id) \
            .eq("status", "open") \
            .execute()

        customer_ids = list({c["customer_id"] for c in convs.data})
        if not customer_ids:
            return

        # Count those with no recent order
        thin_count = 0
        for cid in customer_ids:
            recent_order = supabase.table("orders") \
                .select("id") \
                .eq("business_id", business_id) \
                .eq("customer_id", cid) \
                .gt("created_at", cutoff) \
                .limit(1) \
                .execute()
            if not recent_order.data:
                thin_count += 1

        if thin_count >= threshold:
            await insert_event({
                "business_id": business_id,
                "customer_id": None,
                "event_type": "thin_pipeline",
                "severity": "warning",
                "title": "Thin sales pipeline detected",
                "description": f"{thin_count} customers have open conversations but no orders in the last 14 days.",
                "agent_name": self.name,
                "resolved": False,
            })

    async def _log_revenue_warning(self, business_id: str, this_month: float, last_month: float, drop_pct: float) -> None:
        from app.database import insert_event
        await insert_event({
            "business_id": business_id,
            "customer_id": None,
            "event_type": "revenue_drop",
            "severity": "warning",
            "title": "Revenue trajectory dropping",
            "description": f"Revenue down {drop_pct*100:.0f}% vs last month (₦{this_month:,.0f} vs ₦{last_month:,.0f}).",
            "agent_name": self.name,
            "resolved": False,
        })
