"""
OpsMemory — Base Agent

Abstract base class for all autonomous agents. Every agent:
1. Evaluates a customer + message against its trigger conditions
2. If triggered, proposes an action via propose_action()
3. The action goes into the agent_actions table for approval

All operations are scoped by business_id — agents from one business
can never access or act on another business's customers.
"""

from abc import ABC, abstractmethod
from app.database import insert_agent_action, insert_event, has_pending_action
from app.models.schemas import ExtractedData
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    name: str
    color: str

    def __init__(self, business_id: str, business: Dict):
        self.business_id = business_id
        self.business = business

    @abstractmethod
    async def evaluate(
        self,
        customer: Dict,
        extracted: ExtractedData,
        messages: List[Dict],
    ) -> None:
        """Evaluates the current state and creates agent_actions if needed."""
        pass

    async def _has_pending(self, customer_id: str) -> bool:
        """Check if this agent already has a pending action for this customer in this business."""
        return await has_pending_action(
            self.business_id,
            customer_id,
            self.name,
        )

    async def propose_action(
        self,
        customer: Dict,
        trigger_summary: str,
        proposed_action: str,
        proposed_message: str,
        risk_level: str,
        confidence: float,
        track: str,
    ) -> Dict:
        """
        Creates an agent_action record and a corresponding live_event.
        Both are scoped to self.business_id.
        """
        action = await insert_agent_action({
            "business_id": self.business_id,
            "customer_id": customer["id"],
            "agent_name": self.name,
            "agent_color": self.color,
            "trigger_summary": trigger_summary,
            "proposed_action": proposed_action,
            "proposed_message": proposed_message,
            "risk_level": risk_level,
            "confidence": confidence,
            "track": track,
            "status": "pending",
        })

        await insert_event({
            "business_id": self.business_id,
            "customer_id": customer["id"],
            "event_type": "agent_triggered",
            "severity": "warning" if risk_level in ["medium", "high"] else "info",
            "title": f"{self.name} activated",
            "description": trigger_summary,
            "agent_name": self.name,
        })

        logger.info(
            f"[{self.name}] Proposed action for customer "
            f"{customer.get('name', customer['id'])} (business: {self.business_id})"
        )
        return action
