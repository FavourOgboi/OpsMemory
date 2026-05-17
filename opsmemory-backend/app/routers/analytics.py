"""
OpsMemory — Analytics Router

CEO dashboard metrics endpoint. Business-scoped.
"""

from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.database import supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/pulse")
async def get_pulse(user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    customers = supabase.table("customers").select("*").eq("business_id", biz_id).execute().data
    pending = supabase.table("agent_actions").select("id", count="exact").eq("business_id", biz_id).eq("status", "pending").execute()
    critical_events = supabase.table("live_events").select("id", count="exact").eq("business_id", biz_id).eq("resolved", False).in_("severity", ["critical", "warning"]).execute()
    active_convs = supabase.table("conversations").select("id", count="exact").eq("business_id", biz_id).eq("status", "open").execute()

    from datetime import datetime, timedelta, timezone

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_orders = (
        supabase.table("orders")
        .select("total_amount")
        .eq("business_id", biz_id)
        .gte("created_at", week_ago)
        .execute()
        .data
        or []
    )
    revenue_this_week = sum(float(o.get("total_amount") or 0) for o in recent_orders)
    outstanding = sum(c.get("outstanding_balance", 0) for c in customers)
    health_scores = [c.get("health_score", 80) for c in customers]
    avg_health = round(sum(health_scores) / len(health_scores)) if health_scores else 0

    return {
        "revenue_this_week": revenue_this_week,
        "outstanding_total": outstanding,
        "active_conversations": active_convs.count or 0,
        "health_score": avg_health,
        "revenue_change_percent": 0,
        "critical_alerts": critical_events.count or 0,
        "pending_approvals": pending.count or 0,
    }


@router.get("/events")
async def list_events(user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    result = (
        supabase.table("live_events")
        .select("*, customers(name, business_name)")
        .eq("business_id", biz_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    rows = []
    for row in result.data or []:
        cust = row.pop("customers", None) or {}
        row["customer_name"] = cust.get("business_name") or cust.get("name") or ""
        rows.append(row)
    return rows


@router.get("/agents/status")
async def agent_status(user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    agents_info = [
        {"name": "Collections Agent", "color": "#1A56DB"},
        {"name": "Churn Detection Agent", "color": "#7C3AED"},
        {"name": "Deal Intelligence Agent", "color": "#D97706"},
        {"name": "Fulfillment Agent", "color": "#059669"},
        {"name": "Revenue Pulse Agent", "color": "#E11D48"},
        {"name": "Relationship Health Agent", "color": "#0EA5E9"},
    ]
    result = []
    for a in agents_info:
        recent = supabase.table("agent_actions").select("id, created_at", count="exact").eq("business_id", biz_id).eq("agent_name", a["name"]).execute()
        pending = supabase.table("agent_actions").select("id", count="exact").eq("business_id", biz_id).eq("agent_name", a["name"]).eq("status", "pending").execute()
        status = "triggered" if (pending.count or 0) > 0 else ("active" if (recent.count or 0) > 0 else "idle")
        result.append({**a, "status": status, "event_count": recent.count or 0, "pending_count": pending.count or 0})
    return result
