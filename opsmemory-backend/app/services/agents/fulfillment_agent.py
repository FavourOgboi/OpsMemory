"""
OpsMemory — Fulfillment Agent

Monitors delivery timelines and order statuses. Triggers when:
- A delivery promise date is approaching or has passed
- A customer inquires about delivery status
- An order has been in 'in_transit' for too long

Proposes proactive updates to keep customers informed and prevent complaints.
"""

from app.services.agents.base_agent import BaseAgent
from app.models.schemas import ExtractedData
from app.database import supabase
from typing import Dict, List
from datetime import datetime, timezone


class FulfillmentAgent(BaseAgent):
    name = "Fulfillment Agent"
    color = "#059669"

    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        # Trigger 1: Customer is asking about delivery
        if extracted.intent == "delivery_inquiry":
            await self._handle_delivery_inquiry(customer, extracted)
            return

        # Trigger 2: Scheduled sweep — check for overdue deliveries
        await self._check_overdue_deliveries(customer)

    async def _handle_delivery_inquiry(
        self,
        customer: Dict,
        extracted: ExtractedData,
    ) -> None:
        """Customer is asking about a delivery — find their latest order."""
        if await self._has_pending(customer["id"]):
            return

        # Find their most recent non-delivered order in this business
        orders = supabase.table("orders") \
            .select("*") \
            .eq("business_id", self.business_id) \
            .eq("customer_id", customer["id"]) \
            .in_("status", ["pending", "confirmed", "in_transit"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not orders.data:
            # No pending orders — suggest the sales team clarify
            await self.propose_action(
                customer=customer,
                trigger_summary=(
                    f"{customer.get('name')} inquired about delivery "
                    f"but has no pending orders on record."
                ),
                proposed_action=(
                    f"Respond to {customer.get('name')}'s delivery inquiry. "
                    f"No pending orders found — may need manual lookup or clarification."
                ),
                proposed_message=(
                    f"Hi {customer.get('name', 'there')}, thanks for checking in! "
                    f"Let me look into your order status and get back to you shortly."
                ),
                risk_level="low",
                confidence=0.75,
                track="assign",
            )
            return

        order = orders.data[0]
        order_ref = order.get("order_ref", "N/A")
        status = order.get("status", "pending")

        status_messages = {
            "pending": "Your order is being prepared",
            "confirmed": "Your order has been confirmed and is being processed",
            "in_transit": "Your order is on its way to you",
        }

        await self.propose_action(
            customer=customer,
            trigger_summary=(
                f"{customer.get('name')} asked about delivery. "
                f"Order {order_ref} is currently '{status}'."
            ),
            proposed_action=(
                f"Send delivery status update for order {order_ref} to "
                f"{customer.get('name')}."
            ),
            proposed_message=(
                f"Hi {customer.get('name', 'there')}! "
                f"{status_messages.get(status, 'Your order is being processed')}. "
                f"We'll keep you updated. Is there anything else you need?"
            ),
            risk_level="low",
            confidence=0.90,
            track="auto",
        )

    async def _check_overdue_deliveries(self, customer: Dict) -> None:
        """Check for orders past their promised delivery date."""
        if await self._has_pending(customer["id"]):
            return

        now = datetime.now(timezone.utc)
        overdue_orders = supabase.table("orders") \
            .select("*") \
            .eq("business_id", self.business_id) \
            .eq("customer_id", customer["id"]) \
            .in_("status", ["confirmed", "in_transit"]) \
            .lt("promised_delivery_at", now.isoformat()) \
            .limit(1) \
            .execute()

        if not overdue_orders.data:
            return

        order = overdue_orders.data[0]
        await self.propose_action(
            customer=customer,
            trigger_summary=(
                f"Order {order.get('order_ref', 'N/A')} for {customer.get('name')} "
                f"is past its promised delivery date."
            ),
            proposed_action=(
                f"Send proactive apology/update to {customer.get('name')} about "
                f"the delayed order. Investigate the delay internally."
            ),
            proposed_message=(
                f"Hi {customer.get('name', 'there')}, we wanted to let you know "
                f"your order is taking a bit longer than expected. We're working to "
                f"get it to you as soon as possible. We apologize for the delay!"
            ),
            risk_level="medium",
            confidence=0.87,
            track="assign",
        )
