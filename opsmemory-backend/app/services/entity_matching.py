"""
OpsMemory — Entity Matching Service

Resolves incoming WhatsApp senders to existing customer records.
Priority: phone match → fuzzy name match → create new customer.
All matching is scoped to business_id for strict tenant isolation.
"""

from fuzzywuzzy import fuzz
from typing import Optional, List, Dict
import re


def normalize_phone(phone: str) -> str:
    """
    Normalises Nigerian phone numbers to +234 format.
    Handles: 08012345678, 2348012345678, +2348012345678
    """
    phone = re.sub(r"\D", "", phone)
    if phone.startswith("0") and len(phone) == 11:
        phone = "234" + phone[1:]
    if not phone.startswith("+"):
        phone = "+" + phone
    return phone


def match_customer_by_name(
    extracted_name: Optional[str],
    existing_customers: List[Dict],
    threshold: int = 75,
) -> Optional[Dict]:
    """
    Fuzzy matches an extracted name against existing customer records.
    Compares against both customer name and business name.
    Returns the best match above threshold, or None.
    """
    if not extracted_name or not existing_customers:
        return None

    best_match = None
    best_score = 0

    for customer in existing_customers:
        # Match against customer name
        name_score = fuzz.token_sort_ratio(
            extracted_name.lower(),
            customer.get("name", "").lower(),
        )
        # Match against business name
        business_score = fuzz.token_sort_ratio(
            extracted_name.lower(),
            customer.get("business_name", "").lower(),
        )
        score = max(name_score, business_score)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = customer

    return best_match


async def resolve_customer(
    business_id: str,
    sender_phone: str,
    extracted_name: Optional[str],
    existing_customers: List[Dict],
    db_get_by_phone,
    db_create_customer,
) -> Dict:
    """
    Resolves which customer a message belongs to, scoped to business_id.
    1) Exact phone match within the business
    2) Fuzzy name match against the business's customers
    3) Create a new customer under the business
    """
    # 1. Try exact phone match
    normalised = normalize_phone(sender_phone)
    customer = await db_get_by_phone(business_id, normalised)
    if customer:
        return customer

    # 2. Try fuzzy name match against this business's customers only
    if extracted_name:
        matched = match_customer_by_name(extracted_name, existing_customers)
        if matched:
            return matched

    # 3. Create new customer under this business
    new_customer = await db_create_customer({
        "business_id": business_id,
        "name": extracted_name or normalised,
        "phone": normalised,
        "language": "english",
        "health_score": 80,
        "churn_risk": "low",
    })
    return new_customer
