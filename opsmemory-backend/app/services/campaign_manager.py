"""
Campaign Manager — Orchestrates multi-step agent campaigns.

Handles campaign lifecycle: creation, decision making, outcome checking, escalation.
Fully agentic agents use campaigns to maintain state across multiple interactions.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List, Any
import json
from uuid import UUID
from app.database import supabase
import logging

logger = logging.getLogger(__name__)


class CampaignManager:
    """Manages agent campaigns — the state machine for agentic behavior."""

    @staticmethod
    async def create_campaign(
        business_id: str,
        customer_id: str,
        agent_name: str,
        goal: str,
        max_steps: int = 3,
        initial_context: Dict[str, Any] = None,
        check_interval_hours: int = 48,
    ) -> str:
        """
        Create a new agent campaign.

        Args:
            business_id: Business UUID
            customer_id: Customer UUID
            agent_name: 'collections', 'churn', 'deal_intelligence', etc.
            goal: 'collect_payment', 'recover_churning_customer', 'close_deal'
            max_steps: Max number of autonomous steps before escalation
            initial_context: Initial context data the agent needs
            check_interval_hours: How often to re-evaluate (default 48 for Collections)

        Returns:
            Campaign UUID
        """
        if initial_context is None:
            initial_context = {}

        # Calculate next check time
        next_check_at = (
            datetime.now(timezone.utc) + timedelta(hours=check_interval_hours)
        ).isoformat()

        response = supabase.table("agent_campaigns").insert(
            {
                "business_id": business_id,
                "customer_id": customer_id,
                "agent_name": agent_name,
                "goal": goal,
                "current_step": 1,
                "max_steps": max_steps,
                "status": "active",
                "last_action_at": datetime.now(timezone.utc).isoformat(),
                "next_check_at": next_check_at,
                "context": initial_context,
            }
        ).execute()

        campaign_id = response.data[0]["id"]
        logger.info(
            f"Created campaign {campaign_id} for customer {customer_id}, goal: {goal}"
        )
        return campaign_id

    @staticmethod
    async def get_campaign(campaign_id: str) -> Optional[Dict]:
        """Fetch a campaign by ID."""
        response = supabase.table("agent_campaigns").select("*").eq("id", campaign_id).execute()
        return response.data[0] if response.data else None

    @staticmethod
    async def get_active_campaigns(
        business_id: str, customer_id: str = None, agent_name: str = None
    ) -> List[Dict]:
        """Get all active campaigns, optionally filtered."""
        query = supabase.table("agent_campaigns").select("*").eq("status", "active").eq(
            "business_id", business_id
        )

        if customer_id:
            query = query.eq("customer_id", customer_id)
        if agent_name:
            query = query.eq("agent_name", agent_name)

        response = query.execute()
        return response.data

    @staticmethod
    async def get_campaigns_due_for_check() -> List[Dict]:
        """Get all active campaigns whose next_check_at has passed."""
        now = datetime.now(timezone.utc).isoformat()

        response = (
            supabase.table("agent_campaigns")
            .select("*")
            .eq("status", "active")
            .lte("next_check_at", now)
            .execute()
        )
        return response.data

    @staticmethod
    async def advance_campaign_step(
        campaign_id: str,
        next_check_at_hours: int = 48,
        context_update: Dict[str, Any] = None,
    ) -> Dict:
        """
        Advance campaign to next step.

        Args:
            campaign_id: Campaign UUID
            next_check_at_hours: When to check again
            context_update: Additional context to merge

        Returns:
            Updated campaign dict
        """
        campaign = await CampaignManager.get_campaign(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        new_step = campaign["current_step"] + 1
        next_check_at = (
            datetime.now(timezone.utc) + timedelta(hours=next_check_at_hours)
        ).isoformat()

        # Merge context
        merged_context = {**campaign.get("context", {})}
        if context_update:
            merged_context.update(context_update)

        response = (
            supabase.table("agent_campaigns")
            .update(
                {
                    "current_step": new_step,
                    "last_action_at": datetime.now(timezone.utc).isoformat(),
                    "next_check_at": next_check_at,
                    "context": merged_context,
                }
            )
            .eq("id", campaign_id)
            .execute()
        )

        logger.info(f"Advanced campaign {campaign_id} to step {new_step}")
        return response.data[0]

    @staticmethod
    async def close_campaign(
        campaign_id: str,
        outcome: str,
        reasoning: str = None,
    ) -> Dict:
        """
        Close a campaign with final outcome.

        Args:
            campaign_id: Campaign UUID
            outcome: 'goal_achieved', 'escalated_to_ceo', 'customer_rejected', 'timeout'
            reasoning: Why the campaign is closing

        Returns:
            Updated campaign dict
        """
        response = (
            supabase.table("agent_campaigns")
            .update(
                {
                    "status": "goal_achieved" if outcome == "goal_achieved" else outcome,
                    "outcome": outcome,
                    "outcome_reasoning": reasoning,
                }
            )
            .eq("id", campaign_id)
            .execute()
        )

        logger.info(f"Closed campaign {campaign_id} with outcome: {outcome}")
        return response.data[0]

    @staticmethod
    async def escalate_campaign(
        campaign_id: str,
        escalation_reason: str,
        recommendation: str = None,
    ) -> Dict:
        """
        Escalate campaign to human (CEO) decision.

        Args:
            campaign_id: Campaign UUID
            escalation_reason: Why we're escalating
            recommendation: What the agent recommends

        Returns:
            Updated campaign dict
        """
        campaign = await CampaignManager.get_campaign(campaign_id)

        # Update context with escalation data
        context = campaign.get("context", {})
        context["escalation_reason"] = escalation_reason
        context["escalation_recommendation"] = recommendation
        context["escalated_at"] = datetime.now(timezone.utc).isoformat()

        response = (
            supabase.table("agent_campaigns")
            .update(
                {
                    "status": "escalated",
                    "context": context,
                    "last_action_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", campaign_id)
            .execute()
        )

        logger.info(
            f"Escalated campaign {campaign_id}. Reason: {escalation_reason}"
        )
        return response.data[0]

    @staticmethod
    async def log_campaign_decision(
        campaign_id: str,
        business_id: str,
        step_number: int,
        action_taken: str,
        reasoning: str = None,
        agent_evaluation: Dict = None,
        customer_signal: str = None,
    ) -> str:
        """
        Log a campaign decision for audit trail.

        Args:
            campaign_id: Campaign UUID
            business_id: Business UUID
            step_number: Which step this decision is for
            action_taken: 'sent_reminder', 'escalated_to_ceo', etc.
            reasoning: Why agent chose this action
            agent_evaluation: Full agent decision data
            customer_signal: What was detected in messages

        Returns:
            Log entry UUID
        """
        response = supabase.table("campaign_log").insert(
            {
                "campaign_id": campaign_id,
                "business_id": business_id,
                "step_number": step_number,
                "action_taken": action_taken,
                "reasoning": reasoning,
                "agent_evaluation": agent_evaluation or {},
                "customer_signal": customer_signal,
            }
        ).execute()

        return response.data[0]["id"]

    @staticmethod
    async def get_campaign_history(campaign_id: str) -> List[Dict]:
        """Get all decisions/logs for a campaign."""
        response = (
            supabase.table("campaign_log")
            .select("*")
            .eq("campaign_id", campaign_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data
