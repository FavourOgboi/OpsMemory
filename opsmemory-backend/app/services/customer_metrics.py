"""
Recompute customer scoring fields from orders, invoices, and messages.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.database import supabase

logger = __import__("logging").getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(val) -> Optional[datetime]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None


def _days_between(a: datetime, b: datetime) -> int:
    return max(0, (b - a).days)


async def refresh_customer_metrics(business_id: str, customer_id: str) -> Dict[str, Any]:
    """Recompute and persist metrics for one customer. Returns update dict."""
    orders = (
        supabase.table("orders")
        .select("total_amount, created_at, delivered_at, status")
        .eq("business_id", business_id)
        .eq("customer_id", customer_id)
        .order("created_at")
        .execute()
        .data
        or []
    )

    invoices = (
        supabase.table("invoices")
        .select("amount, status, due_date")
        .eq("business_id", business_id)
        .eq("customer_id", customer_id)
        .execute()
        .data
        or []
    )

    cust = (
        supabase.table("customers")
        .select("*")
        .eq("id", customer_id)
        .eq("business_id", business_id)
        .single()
        .execute()
        .data
    )
    if not cust:
        return {}

    now = _utcnow()
    total_revenue = sum(float(o.get("total_amount") or 0) for o in orders if o.get("status") == "delivered")

    outstanding = sum(
        float(i.get("amount") or 0)
        for i in invoices
        if i.get("status") in ("pending", "overdue")
    )
    open_invoices = sum(1 for i in invoices if i.get("status") in ("pending", "overdue"))

    # Days since last order
    order_dates: List[datetime] = []
    for o in orders:
        dt = _parse_dt(o.get("delivered_at")) or _parse_dt(o.get("created_at"))
        if dt:
            order_dates.append(dt)
    days_since_last = 999
    if order_dates:
        days_since_last = _days_between(max(order_dates), now)

    # Median gap between orders
    order_frequency = 0
    if len(order_dates) >= 2:
        gaps = []
        for i in range(1, len(order_dates)):
            gaps.append(_days_between(order_dates[i - 1], order_dates[i]))
        gaps.sort()
        order_frequency = gaps[len(gaps) // 2]

    # Health score 0-100
    health = 70
    if total_revenue >= 2_000_000:
        health += 10
    elif total_revenue >= 500_000:
        health += 5
    if days_since_last <= 7:
        health += 10
    elif days_since_last <= 14:
        health += 5
    elif days_since_last > 30:
        health -= 15
    elif days_since_last > 21:
        health -= 8
    if outstanding == 0:
        health += 5
    elif outstanding > 200_000:
        health -= 12
    elif outstanding > 50_000:
        health -= 5
    payment_score = int(cust.get("payment_behavior_score") or 70)
    health = int(max(0, min(100, (health + payment_score) // 2)))

    # Churn risk
    churn = "low"
    if order_frequency > 0 and days_since_last > order_frequency * 2:
        churn = "high"
    elif order_frequency > 0 and days_since_last > order_frequency * 1.5:
        churn = "medium"
    if health <= 35:
        churn = "high"
    elif health <= 50 and churn == "low":
        churn = "medium"
    if outstanding > 300_000 and days_since_last > 14:
        churn = "high"

    updates = {
        "total_revenue": total_revenue,
        "outstanding_balance": outstanding,
        "open_invoices": open_invoices,
        "days_since_last_order": min(days_since_last, 999),
        "order_frequency_days": order_frequency or 14,
        "health_score": health,
        "churn_risk": churn,
        "last_order_at": max(order_dates).isoformat() if order_dates else cust.get("last_order_at"),
    }

    supabase.table("customers").update(updates).eq("id", customer_id).eq(
        "business_id", business_id
    ).execute()

    return {**cust, **updates}
