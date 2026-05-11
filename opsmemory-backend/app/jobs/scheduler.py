"""
OpsMemory — Background Job Scheduler

APScheduler with two recurring jobs:
1. Morning CEO digest at 7am Lagos time (UTC+1) — daily
2. Agent sweep every 30 minutes — evaluates all customers against all agents

All operations are business-scoped. Each job iterates over active businesses
and processes their data independently.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import supabase
from app.services.email_service import send_ceo_digest
from app.services.agents.collections_agent import CollectionsAgent
from app.services.agents.churn_agent import ChurnAgent
from app.services.agents.fulfillment_agent import FulfillmentAgent
from app.services.agents.revenue_pulse_agent import RevenuePulseAgent
from app.services.agents.relationship_agent import RelationshipHealthAgent
from app.models.schemas import ExtractedData
import logging
import pytz

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone=pytz.timezone("Africa/Lagos"))


async def run_morning_digest():
    """Runs at 7am Lagos time. Sends CEO digest to all active businesses."""
    businesses = supabase.table("businesses") \
        .select("id, owner_email") \
        .eq("whatsapp_connected", True) \
        .execute()
    for biz in businesses.data:
        try:
            await send_ceo_digest(biz["id"])
            logger.info(f"Morning digest sent for business {biz['id']}")
        except Exception as e:
            logger.error(f"Digest failed for {biz['id']}: {e}")


async def run_agent_sweep():
    """
    Runs every 30 minutes. Sweeps all businesses and evaluates
    all customers against Collections, Churn, Fulfillment,
    Revenue Pulse, and Relationship Health agents.
    Catches overdue invoices / churn not triggered by a message.
    """
    businesses = supabase.table("businesses") \
        .select("*") \
        .eq("whatsapp_connected", True) \
        .execute()

    empty_extracted = ExtractedData(
        intent="general_inquiry",
        language="english",
        confidence=1.0,
    )

    for biz in businesses.data:
        customers = supabase.table("customers") \
            .select("*") \
            .eq("business_id", biz["id"]) \
            .execute()

        agents = [
            CollectionsAgent(biz["id"], biz),
            ChurnAgent(biz["id"], biz),
            FulfillmentAgent(biz["id"], biz),
            RevenuePulseAgent(biz["id"], biz),
            RelationshipHealthAgent(biz["id"], biz),
        ]

        for customer in customers.data:
            for agent in agents:
                try:
                    await agent.evaluate(customer, empty_extracted, [])
                except Exception as e:
                    logger.error(
                        f"Agent sweep error — {agent.name} for "
                        f"customer {customer.get('id')}: {e}"
                    )


def start_scheduler():
    """Start the APScheduler with morning digest and agent sweep jobs."""
    scheduler.add_job(
        run_morning_digest,
        CronTrigger(hour=7, minute=0),
        id="morning_digest",
        replace_existing=True,
    )
    scheduler.add_job(
        run_agent_sweep,
        CronTrigger(minute="*/30"),
        id="agent_sweep",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Scheduler started — morning digest at 7am Lagos, "
        "agent sweep every 30 minutes"
    )
