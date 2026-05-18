"""
Agent orchestration — lead agent selection, specialized replies, routing tracks.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import logging

from app.models.schemas import ExtractedData
from app.services.customer_metrics import refresh_customer_metrics
from app.services.extraction import generate_customer_response
from app.services.rag import retrieve_relevant_knowledge, format_knowledge_for_prompt
from app.services.agents.collections_agent import CollectionsAgent
from app.services.agents.churn_agent import ChurnAgent
from app.services.agents.deal_agent import DealAgent
from app.services.agents.fulfillment_agent import FulfillmentAgent
from app.services.agents.revenue_pulse_agent import RevenuePulseAgent
from app.services.agents.relationship_agent import RelationshipHealthAgent
from app.services.llm_client import get_llm_client, resolve_model

logger = logging.getLogger(__name__)

PRODUCT_KEYWORDS = (
    "product", "price", "rice", "beans", "fertilizer", "seed", "oil", "feed",
    "catalogue", "catalog", "sell", "stock", "cost", "how much",
)


@dataclass
class OrchestratorResult:
    text: Optional[str]
    image_url: Optional[str]
    track: str  # auto | assign | escalate
    lead_agent: str
    should_send: bool
    agent_recommendation: str


def _message_mentions_products(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in PRODUCT_KEYWORDS)


def select_lead_agent(
    extracted: ExtractedData,
    customer: dict,
    business: dict,
    last_inbound: str,
) -> str:
    intent = extracted.intent or "general_inquiry"
    outstanding = float(customer.get("outstanding_balance") or 0)
    threshold = float(business.get("deal_approval_threshold") or 100000)
    amount = float(extracted.amount or 0)

    if intent == "deal_negotiation" or (amount >= threshold and intent in ("order_request", "price_inquiry")):
        return "Deal Intelligence Agent"
    if intent in ("balance_inquiry", "payment_claim", "payment_promise") or (
        outstanding > 0 and intent in ("confirmation", "greeting")
    ):
        return "Collections Agent"
    if intent == "complaint" or extracted.sentiment in ("negative", "urgent"):
        return "Relationship Health Agent"
    if intent == "delivery_inquiry":
        return "Fulfillment Agent"
    if intent in ("price_inquiry", "order_request") or _message_mentions_products(last_inbound):
        return "Fulfillment Agent"
    if intent == "greeting":
        return "Fulfillment Agent"
    if customer.get("churn_risk") in ("high", "critical"):
        return "Churn Detection Agent"
    return "Fulfillment Agent"


def _track_for_agent(agent_name: str, extracted: ExtractedData, business: dict) -> str:
    if agent_name == "Deal Intelligence Agent":
        return "escalate"
    if agent_name == "Collections Agent" and float(extracted.amount or 0) >= float(
        business.get("deal_approval_threshold") or 100000
    ):
        return "escalate"
    if agent_name == "Relationship Health Agent" and extracted.sentiment in ("negative", "urgent"):
        return "assign"
    if agent_name in ("Fulfillment Agent", "Churn Detection Agent"):
        return "auto"
    if agent_name == "Collections Agent":
        return "auto" if extracted.intent in ("balance_inquiry", "payment_promise") else "assign"
    return "auto"


async def _draft_collections(
    business_id: str,
    business: dict,
    customer: dict,
    extracted: ExtractedData,
    messages: List[dict],
) -> str:
    outstanding = float(customer.get("outstanding_balance") or 0)
    open_inv = int(customer.get("open_invoices") or 0)
    lang = extracted.language.value if hasattr(extracted.language, "value") else str(extracted.language or "english")

    if extracted.intent == "balance_inquiry" or "balance" in (messages[-1].get("content", "") if messages else "").lower():
        if outstanding > 0:
            rec = f"Customer asked balance: ₦{outstanding:,.0f} due across {open_inv} invoice(s). Give amount and offer payment details."
        else:
            rec = "Customer asked balance: ₦0 outstanding. Confirm clear and invite next order."
        return await generate_customer_response(
            business_id=business_id,
            business_name=business["name"],
            business_type=business["type"],
            customer_name=customer.get("name") or "Customer",
            language=lang,
            conversation_history=messages,
            agent_recommendation=rec,
            extracted_data=extracted,
            customer=customer,
        )

    from app.services.agents.collections_agent import COLLECTIONS_PROMPT

    days_overdue = int(customer.get("days_since_last_order") or 0)
    client = get_llm_client("cheap")
    response = await client.chat.completions.create(
        model=resolve_model("cheap"),
        messages=[
            {
                "role": "user",
                "content": COLLECTIONS_PROMPT.format(
                    customer_name=customer.get("name") or "Customer",
                    days_overdue=days_overdue,
                    amount=f"{outstanding:,.0f}",
                    language=lang,
                    previous_contact=messages[-1].get("content", "") if messages else "",
                ),
            }
        ],
        max_tokens=150,
        temperature=0.4,
    )
    return response.choices[0].message.content.strip()


async def _catalog_image_from_rag(business_id: str, query: str) -> Optional[str]:
    chunks = await retrieve_relevant_knowledge(business_id, query, top_k=3, threshold=0.72)
    for c in chunks:
        meta = c.get("metadata") or {}
        if meta.get("image_url") and meta.get("price", 0) > 0:
            return meta.get("image_url")
    return None


async def orchestrate_reply(
    business_id: str,
    business: dict,
    customer: dict,
    extracted: ExtractedData,
    messages: List[dict],
    last_inbound: str,
) -> OrchestratorResult:
    """Refresh metrics, run agents, draft lead-agent reply."""
    customer = await refresh_customer_metrics(business_id, customer["id"]) or customer

    agents = [
        CollectionsAgent(business_id, business),
        ChurnAgent(business_id, business),
        DealAgent(business_id, business),
        FulfillmentAgent(business_id, business),
        RevenuePulseAgent(business_id, business),
        RelationshipHealthAgent(business_id, business),
    ]
    for agent in agents:
        try:
            await agent.evaluate(customer, extracted, messages)
        except Exception as e:
            logger.error("Agent %s error: %s", agent.name, e, exc_info=True)

    lead = select_lead_agent(extracted, customer, business, last_inbound)
    track = _track_for_agent(lead, extracted, business)
    lang = extracted.language.value if hasattr(extracted.language, "value") else str(extracted.language or "english")

    image_url: Optional[str] = None
    text: Optional[str] = None
    rec = f"Lead agent: {lead}. Answer the customer's last message directly using catalog and policies only."

    if lead == "Deal Intelligence Agent":
        return OrchestratorResult(
            text=None,
            image_url=None,
            track="escalate",
            lead_agent=lead,
            should_send=False,
            agent_recommendation="Deal requires CEO approval — reply held for dashboard.",
        )

    if lead == "Collections Agent":
        try:
            text = await _draft_collections(business_id, business, customer, extracted, messages)
        except Exception as e:
            logger.error("Collections draft failed: %s", e)
            text = await generate_customer_response(
                business_id=business_id,
                business_name=business["name"],
                business_type=business["type"],
                customer_name=customer.get("name") or "Customer",
                language=lang,
                conversation_history=messages,
                agent_recommendation=rec,
                extracted_data=extracted,
                customer=customer,
            )

    elif lead == "Relationship Health Agent":
        text = await generate_customer_response(
            business_id=business_id,
            business_name=business["name"],
            business_type=business["type"],
            customer_name=customer.get("name") or "Customer",
            language=lang,
            conversation_history=messages,
            agent_recommendation="Empathize, acknowledge complaint, offer concrete next step. Do not deflect.",
            extracted_data=extracted,
            customer=customer,
        )
        track = "assign"

    else:
        # Fulfillment / sales / churn re-engagement
        intent = extracted.intent or "general_inquiry"
        if intent in ("price_inquiry", "order_request") or _message_mentions_products(last_inbound):
            rec = (
                "List relevant products with exact ₦ prices from knowledge base. "
                "Ask quantity and delivery area to close the order."
            )
            image_url = await _catalog_image_from_rag(business_id, last_inbound or extracted.product_mentioned or "products")
        elif intent == "general_inquiry" and _message_mentions_products(last_inbound):
            rec = "Introduce Bola Agro briefly, then list main product categories with sample prices from knowledge."
            image_url = await _catalog_image_from_rag(business_id, "catalog products")
        elif intent == "greeting":
            rec = "Warm greeting, ask how you can help today (orders, prices, delivery)."
        elif lead == "Churn Detection Agent":
            rec = "Customer may be drifting — warm check-in, ask if they need restock on usual items."

        text = await generate_customer_response(
            business_id=business_id,
            business_name=business["name"],
            business_type=business["type"],
            customer_name=customer.get("name") or "Customer",
            language=lang,
            conversation_history=messages,
            agent_recommendation=rec,
            extracted_data=extracted,
            customer=customer,
        )

    should_send = bool(
        text
        and business.get("auto_reply_enabled", True)
        and track != "escalate"
    )

    return OrchestratorResult(
        text=text,
        image_url=image_url,
        track=track,
        lead_agent=lead,
        should_send=should_send,
        agent_recommendation=rec,
    )
