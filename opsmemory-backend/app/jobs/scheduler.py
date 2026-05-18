"""
OpsMemory — Background Job Scheduler

APScheduler with three recurring jobs:
1. Morning CEO digest at 7am Lagos time (UTC+1) — daily
2. Agent sweep every 30 minutes — evaluates all customers against all agents
3. Campaign continuations every 4 hours — continues autonomous agent campaigns

All operations are business-scoped. Each job iterates over active businesses
and processes their data independently.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import supabase
from app.services.email_service import send_ceo_digest
from app.services.agents.collections_agent import CollectionsAgent
from app.services.agents.churn_agent import ChurnAgent
from app.services.agents.deal_agent import DealAgent
from app.services.agents.fulfillment_agent import FulfillmentAgent
from app.services.agents.revenue_pulse_agent import RevenuePulseAgent
from app.services.agents.relationship_agent import RelationshipHealthAgent
from app.services.campaign_manager import CampaignManager
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
            DealAgent(biz["id"], biz),
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

        # Business-level revenue and pipeline checks
        try:
            rp_agent = RevenuePulseAgent(biz["id"], biz)
            await rp_agent.check_business_revenue_health(biz["id"])
            await rp_agent.check_pipeline_health(biz["id"])
        except Exception as e:
            logger.error(f"RevenuePulse business-level check error for {biz['id']}: {e}")


async def run_campaign_continuations():
    """
    Runs every 4 hours. Continues autonomous agent campaigns.
    
    For each active campaign whose next_check_at has passed:
    1. Fetch the campaign and customer data
    2. Get recent messages from the conversation
    3. Call agent's continue_campaign() method
    4. Agent decides next step: send follow-up, escalate, or close
    """
    campaigns = await CampaignManager.get_campaigns_due_for_check()
    logger.info(f"Found {len(campaigns)} campaigns due for check")

    for campaign in campaigns:
        try:
            business_id = campaign["business_id"]
            customer_id = campaign["customer_id"]
            agent_name = campaign["agent_name"]

            # Fetch customer data
            customer_response = supabase.table("customers") \
                .select("*") \
                .eq("id", customer_id) \
                .eq("business_id", business_id) \
                .execute()

            if not customer_response.data:
                logger.warning(f"Customer {customer_id} not found for campaign {campaign['id']}")
                continue

            customer = customer_response.data[0]

            # Fetch recent messages for this customer
            messages_response = supabase.table("messages") \
                .select("*") \
                .eq("customer_id", customer_id) \
                .eq("business_id", business_id) \
                .order("created_at", desc=True) \
                .limit(20) \
                .execute()

            recent_messages = list(reversed(messages_response.data))  # Chronological order

            # Get agent instance
            if agent_name == "Collections":
                agent = CollectionsAgent(business_id, {})
            elif agent_name == "Churn":
                agent = ChurnAgent(business_id, {})
            elif agent_name == "Deal":
                agent = DealAgent(business_id, {})
            else:
                logger.warning(f"Unknown agent type: {agent_name}")
                continue

            # Continue campaign
            await agent.continue_campaign(
                business_id=business_id,
                campaign=campaign,
                customer=customer,
                recent_messages=recent_messages,
            )

            logger.info(f"Continued campaign {campaign['id']} for {agent_name} agent")

        except Exception as e:
            logger.error(f"Error continuing campaign {campaign.get('id')}: {e}")


def start_scheduler():
    """Start the APScheduler with all recurring jobs."""
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
    scheduler.add_job(
        run_campaign_continuations,
        CronTrigger(hour="*/4"),  # Every 4 hours
        id="campaign_continuations",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Scheduler started — morning digest at 7am Lagos, "
        "agent sweep every 30 minutes, campaign continuations every 4 hours"
    )
