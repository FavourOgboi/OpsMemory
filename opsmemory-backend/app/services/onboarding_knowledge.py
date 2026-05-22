"""
Sync onboarding form data into knowledge_base so WhatsApp RAG can answer immediately.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from app.database import supabase
from app.services.rag import delete_all_from_source, store_knowledge_entry

logger = logging.getLogger(__name__)

ONBOARDING_SOURCE = "onboarding"


async def clear_onboarding_knowledge(business_id: str) -> None:
    """Remove prior onboarding-derived chunks before re-sync."""
    try:
        await delete_all_from_source(business_id, ONBOARDING_SOURCE)
    except Exception as exc:
        logger.warning("Could not clear onboarding knowledge: %s", exc)


def _parse_products_text(text: str) -> List[Dict[str, Any]]:
    """
    Parse lines like:
      Rice 50kg - ₦45,000
      Beans 25kg — 32000
    """
    items: List[Dict[str, Any]] = []
    for line in (text or "").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(
            r"^(.+?)\s*[-–—:]\s*(?:₦|N)?\s*([\d,]+(?:\.\d+)?)\s*(.*)$",
            line,
            re.IGNORECASE,
        )
        if m:
            name = m.group(1).strip()
            price = float(m.group(2).replace(",", ""))
            unit = m.group(3).strip() or None
            items.append({"name": name, "price": price, "unit": unit})
        else:
            items.append({"name": line, "price": None, "unit": None})
    return items


async def sync_onboarding_to_knowledge(
    business_id: str,
    payload: Dict[str, Any],
) -> Dict[str, int]:
    """
    Embed onboarding answers into knowledge_base for RAG retrieval on WhatsApp.
    Returns counts of entries stored by category.
    """
    await clear_onboarding_knowledge(business_id)

    counts = {"profile": 0, "catalog": 0, "policy": 0, "faq": 0}

    name = payload.get("business_name") or "Business"
    btype = payload.get("business_type") or ""
    city = payload.get("city") or ""
    owner = payload.get("owner_name") or ""
    website = payload.get("website_url") or ""
    instagram = payload.get("instagram_handle") or ""
    other = payload.get("other_link") or ""
    catalog_url = payload.get("catalog_url") or ""
    whatsapp = payload.get("whatsapp_number") or ""
    description = payload.get("business_description") or ""
    languages = payload.get("agent_languages") or []
    deal_threshold = payload.get("deal_threshold")
    auto_reply = payload.get("auto_reply_enabled", True)

    profile_parts = [
        f"Business name: {name}.",
        f"Industry: {btype}." if btype else "",
        f"Location: {city}." if city else "",
        f"Owner / contact: {owner}." if owner else "",
        f"WhatsApp: {whatsapp}." if whatsapp else "",
        f"Website: {website}." if website else "",
        f"Instagram: {instagram}." if instagram else "",
        f"Other link: {other}." if other else "",
        f"Catalog link: {catalog_url}." if catalog_url else "",
        f"About: {description}" if description else "",
    ]
    profile_text = " ".join(p for p in profile_parts if p).strip()
    if profile_text:
        await store_knowledge_entry(
            business_id=business_id,
            content=profile_text,
            category="general",
            title=f"{name} — Business profile",
            source_file=ONBOARDING_SOURCE,
            metadata={"source": ONBOARDING_SOURCE, "kind": "profile"},
        )
        counts["profile"] += 1

    products_text = payload.get("products_text") or ""
    for item in _parse_products_text(products_text):
        pname = item["name"]
        price = item.get("price")
        unit = item.get("unit")
        if price is not None:
            content = f"{pname}: available. Price: ₦{price:,.0f}"
            if unit:
                content += f" {unit}"
            content += "."
        else:
            content = f"{pname}: listed product or service."
        await store_knowledge_entry(
            business_id=business_id,
            content=content,
            category="catalog",
            title=pname[:80],
            source_file=ONBOARDING_SOURCE,
            metadata={"source": ONBOARDING_SOURCE, "price": price, "unit": unit},
        )
        counts["catalog"] += 1

    langs = ", ".join(languages) if languages else "english"
    policy_lines = [
        f"Agent may reply automatically to routine FAQs: {'yes' if auto_reply else 'no'}.",
        f"Supported customer languages: {langs}.",
    ]
    if deal_threshold is not None:
        policy_lines.append(
            f"Deals above ₦{float(deal_threshold):,.0f} require CEO approval."
        )
    await store_knowledge_entry(
        business_id=business_id,
        content=" ".join(policy_lines),
        category="policy",
        title="Agent settings",
        source_file=ONBOARDING_SOURCE,
        metadata={"source": ONBOARDING_SOURCE, "policy_type": "agent"},
    )
    counts["policy"] += 1

    faqs = [
        (
            "Where can I see your products or catalog?",
            f"View our catalog here: {catalog_url}" if catalog_url else f"Contact {name} on WhatsApp for the latest catalog and prices.",
        ),
        (
            "What is your website or social media?",
            " ".join(
                p
                for p in [
                    f"Website: {website}" if website else "",
                    f"Instagram: {instagram}" if instagram else "",
                    f"More: {other}" if other else "",
                ]
                if p
            )
            or f"Reach us on WhatsApp at {whatsapp}." if whatsapp else f"Contact {name} directly.",
        ),
    ]
    for question, answer in faqs:
        if answer.strip():
            await store_knowledge_entry(
                business_id=business_id,
                content=f"Question: {question}\nAnswer: {answer}",
                category="faq",
                title=question[:80],
                source_file=ONBOARDING_SOURCE,
                metadata={"source": ONBOARDING_SOURCE},
            )
            counts["faq"] += 1

    logger.info("Onboarding knowledge synced for %s: %s", business_id, counts)
    return counts
