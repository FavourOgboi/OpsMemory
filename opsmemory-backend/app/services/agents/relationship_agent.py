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
                return

        # ── Trigger 4: Complaint resolved but no order within 7 days ─────────
        await self._check_complaint_resolution_gap(customer)

        # ── Trigger 5: Order frequency anomaly ────────────────────────────────
        await self._check_order_frequency_anomaly(customer)

    async def _check_complaint_resolution_gap(self, customer: Dict) -> None:
        """
        If a complaint was resolved but no new order placed within 7 days,
        propose a check-in to ensure satisfaction.
        """
        from datetime import datetime, timedelta, timezone
        if await self._has_pending(customer["id"]):
            return

        # Find most recent resolved complaint event
        complaint_event = supabase.table("live_events") \
            .select("*") \
            .eq("business_id", self.business_id) \
            .eq("customer_id", customer["id"]) \
            .eq("event_type", "complaint_resolved") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not complaint_event.data:
            return

        resolved_at = datetime.fromisoformat(complaint_event.data[0]["created_at"].replace("Z", "+00:00"))
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

        if resolved_at < seven_days_ago:
            return  # Too old

        # Check if any order since resolution
        orders_since = supabase.table("orders") \
            .select("id") \
            .eq("business_id", self.business_id) \
            .eq("customer_id", customer["id"]) \
            .gt("created_at", resolved_at.isoformat()) \
            .limit(1) \
            .execute()

        if orders_since.data:
            return  # Order placed since resolution

        await self.propose_action(
            customer=customer,
            trigger_summary=(
                f"Complaint for {customer.get('name')} was resolved but no new order "
                f"placed in the last 7 days. Check-in recommended."
            ),
            proposed_action=(
                f"Send satisfaction check-in to {customer.get('name')} after complaint resolution."
            ),
            proposed_message=(
                f"Hi {customer.get('name', 'there')}, I hope the issue we resolved last week "
                f"hasn't caused any further problems. Is there anything else we can help with?"
            ),
            risk_level="low",
            confidence=0.75,
            track="assign",
        )

    async def _check_order_frequency_anomaly(self, customer: Dict) -> None:
        """
        If a customer's average order frequency drops by >40% over the last 30 days
        vs their lifetime average, propose action before churn agent catches it.
        """
        from datetime import datetime, timedelta, timezone
        if await self._has_pending(customer["id"]):
            return

        total_revenue = customer.get("total_revenue", 0)
        if total_revenue < 100000:
            return

        now = datetime.now(timezone.utc)
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        sixty_days_ago = (now - timedelta(days=60)).isoformat()

        # Orders in last 30 days
        recent_orders = supabase.table("orders") \
            .select("created_at") \
            .eq("business_id", self.business_id) \
            .eq("customer_id", customer["id"]) \
            .gte("created_at", thirty_days_ago) \
            .execute()

        # Orders in previous 30 days
        prior_orders = supabase.table("orders") \
            .select("created_at") \
            .eq("business_id", self.business_id) \
            .eq("customer_id", customer["id"]) \
            .gte("created_at", sixty_days_ago) \
            .lt("created_at", thirty_days_ago) \
            .execute()

        recent_count = len(recent_orders.data)
        prior_count = len(prior_orders.data)

        if prior_count > 0:
            drop_pct = (prior_count - recent_count) / prior_count
            if drop_pct > 0.40:
                await self.propose_action(
                    customer=customer,
                    trigger_summary=(
                        f"{customer.get('name')}'s order frequency dropped {drop_pct*100:.0f}% "
                        f"in the last 30 days ({recent_count} vs {prior_count} prior). "
                        f"Early relationship warning."
                    ),
                    proposed_action=(
                        f"Proactively reach out to {customer.get('name')} to understand "
                        f"the drop in order frequency."
                    ),
                    proposed_message=(
                        f"Hi {customer.get('name', 'there')}, we noticed you've been ordering "
                        f"a bit less lately. Just wanted to check if everything is okay or if "
                        f"there's anything we can improve. Your feedback means a lot to us."
                    ),
                    risk_level="medium",
                    confidence=0.80,
                    track="assign",
                )
