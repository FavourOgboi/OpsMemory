"""
OpsMemory — Supabase Database Client & Helper Functions

Uses the service role key to bypass RLS.
Every query is scoped by business_id for strict multi-tenant isolation —
no business can ever access another business's data.
"""

from supabase import create_client, Client
from app.config import settings
from typing import Optional, List, Dict, Any
from functools import lru_cache


@lru_cache()
def _get_client() -> Client:
    """Lazy-initialize Supabase client on first use (not at import time)."""
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


class _LazySupabase:
    """Proxy that defers Supabase client creation until first attribute access."""
    def __getattr__(self, name):
        return getattr(_get_client(), name)


supabase: Client = _LazySupabase()  # type: ignore


# ── Business helpers ──────────────────────────────────────────────────────────

async def get_business_by_id(business_id: str) -> Optional[Dict]:
    """Fetch a single business by its ID."""
    result = supabase.table("businesses") \
        .select("*") \
        .eq("id", business_id) \
        .single() \
        .execute()
    return result.data


async def get_business_by_owner(clerk_user_id: str) -> Optional[Dict]:
    """Fetch a business by the Clerk user ID of its owner."""
    result = supabase.table("businesses") \
        .select("*") \
        .eq("owner_user_id", clerk_user_id) \
        .maybeSingle() \
        .execute()
    return result.data


# ── Customer helpers ──────────────────────────────────────────────────────────

async def get_customer_by_phone(business_id: str, phone: str) -> Optional[Dict]:
    """Exact phone match within a specific business."""
    result = supabase.table("customers") \
        .select("*") \
        .eq("business_id", business_id) \
        .eq("phone", phone) \
        .maybeSingle() \
        .execute()
    return result.data


async def get_customer_by_id(business_id: str, customer_id: str) -> Optional[Dict]:
    """Fetch a single customer, scoped to the business."""
    result = supabase.table("customers") \
        .select("*") \
        .eq("id", customer_id) \
        .eq("business_id", business_id) \
        .single() \
        .execute()
    return result.data


async def get_business_customers(business_id: str) -> List[Dict]:
    """All customers for a business, ordered by revenue descending."""
    result = supabase.table("customers") \
        .select("*") \
        .eq("business_id", business_id) \
        .order("total_revenue", desc=True) \
        .execute()
    return result.data


async def get_all_customers_for_agents(business_id: str) -> List[Dict]:
    """Customers with related events for agent evaluation sweeps."""
    result = supabase.table("customers") \
        .select("*, live_events(event_type, created_at, resolved)") \
        .eq("business_id", business_id) \
        .execute()
    return result.data


async def create_customer(customer_data: Dict) -> Dict:
    """Insert a new customer record."""
    result = supabase.table("customers") \
        .insert(customer_data) \
        .execute()
    return result.data[0]


async def update_customer(business_id: str, customer_id: str, updates: Dict) -> Dict:
    """Update a customer, scoped to the business for isolation."""
    result = supabase.table("customers") \
        .update(updates) \
        .eq("id", customer_id) \
        .eq("business_id", business_id) \
        .execute()
    return result.data[0]


# ── Conversation helpers ──────────────────────────────────────────────────────

async def get_or_create_conversation(business_id: str, customer_id: str) -> Dict:
    """Returns an open conversation or creates one. Business-scoped."""
    existing = supabase.table("conversations") \
        .select("*") \
        .eq("business_id", business_id) \
        .eq("customer_id", customer_id) \
        .eq("status", "open") \
        .maybeSingle() \
        .execute()
    if existing.data:
        return existing.data
    new_conv = supabase.table("conversations").insert({
        "business_id": business_id,
        "customer_id": customer_id,
        "status": "open",
        "assigned_to": None,
        "unread_count": 0,
    }).execute()
    return new_conv.data[0]


# ── Message helpers ───────────────────────────────────────────────────────────

async def insert_message(message_data: Dict) -> Dict:
    """Insert a message record. business_id must be in message_data."""
    result = supabase.table("messages") \
        .insert(message_data) \
        .execute()
    return result.data[0]


# ── Event helpers ─────────────────────────────────────────────────────────────

async def insert_event(event_data: Dict) -> Dict:
    """Insert a live_event. business_id must be in event_data."""
    result = supabase.table("live_events") \
        .insert(event_data) \
        .execute()
    return result.data[0]


# ── Agent action helpers ──────────────────────────────────────────────────────

async def insert_agent_action(action_data: Dict) -> Dict:
    """Insert an agent_action. business_id must be in action_data."""
    result = supabase.table("agent_actions") \
        .insert(action_data) \
        .execute()
    return result.data[0]


async def get_pending_approvals(business_id: str) -> List[Dict]:
    """All pending agent actions for a business, newest first."""
    result = supabase.table("agent_actions") \
        .select("*, customers(name, business_name, total_revenue)") \
        .eq("business_id", business_id) \
        .eq("status", "pending") \
        .order("created_at", desc=True) \
        .execute()
    return result.data


async def has_pending_action(
    business_id: str,
    customer_id: str,
    agent_name: str,
) -> bool:
    """Checks if a pending action already exists for this agent + customer + business."""
    result = supabase.table("agent_actions") \
        .select("id") \
        .eq("business_id", business_id) \
        .eq("customer_id", customer_id) \
        .eq("agent_name", agent_name) \
        .eq("status", "pending") \
        .maybeSingle() \
        .execute()
    return result.data is not None


# ── Business user helpers ─────────────────────────────────────────────────────

async def get_business_user(business_id: str, clerk_user_id: str) -> Optional[Dict]:
    """Fetch a business_user, scoped to the business."""
    result = supabase.table("business_users") \
        .select("*") \
        .eq("business_id", business_id) \
        .eq("clerk_user_id", clerk_user_id) \
        .maybeSingle() \
        .execute()
    return result.data


async def get_business_user_by_phone(phone: str) -> Optional[Dict]:
    """Fetch a business_user by phone (for voice caller identification)."""
    result = supabase.table("business_users") \
        .select("*, businesses(*)") \
        .eq("phone", phone) \
        .eq("active", True) \
        .maybeSingle() \
        .execute()
    return result.data
