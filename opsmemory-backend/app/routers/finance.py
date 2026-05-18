"""
OpsMemory — Finance Router

Returns invoices, payment states, and reconciliation data.
Role-filtered: finance and ceo roles only.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user, require_role
from app.database import supabase
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/summary")
async def finance_summary(user: dict = Depends(require_role(["ceo", "finance"]))):
    """Returns finance dashboard summary scoped to the business."""
    biz_id = user["business_id"]

    invoices = supabase.table("invoices") \
        .select("*, customers(name)") \
        .eq("business_id", biz_id) \
        .order("due_date", desc=True) \
        .limit(50) \
        .execute()

    payments = supabase.table("payments") \
        .select("*, customers(name)") \
        .eq("business_id", biz_id) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()

    # Aggregate stats
    pending_total = sum(i.get("amount", 0) for i in invoices.data if i.get("status") == "pending")
    overdue_total = sum(i.get("amount", 0) for i in invoices.data if i.get("status") == "overdue")
    paid_total = sum(p.get("amount", 0) for p in payments.data if p.get("confirmed_at"))

    return {
        "invoices": invoices.data,
        "payments": payments.data,
        "stats": {
            "pending_total": pending_total,
            "overdue_total": overdue_total,
            "paid_total": paid_total,
            "total_invoices": len(invoices.data),
            "total_payments": len(payments.data),
        },
    }


@router.get("/history")
async def finance_history(user: dict = Depends(require_role(["ceo", "finance"]))):
    """Returns monthly revenue (from orders) and collected (from payments) for the last 6 months."""
    biz_id = user["business_id"]

    six_months_ago = (datetime.utcnow() - timedelta(days=180)).isoformat()

    orders = supabase.table("orders") \
        .select("total_amount, created_at") \
        .eq("business_id", biz_id) \
        .gte("created_at", six_months_ago) \
        .execute()

    payments = supabase.table("payments") \
        .select("amount, confirmed_at") \
        .eq("business_id", biz_id) \
        .gte("confirmed_at", six_months_ago) \
        .execute()

    revenue_by_month: dict[str, float] = defaultdict(float)
    collected_by_month: dict[str, float] = defaultdict(float)

    for o in orders.data or []:
        created = o["created_at"]
        created_str = created.isoformat() if hasattr(created, 'isoformat') else str(created)
        month = created_str[:7]  # YYYY-MM
        revenue_by_month[month] += float(o.get("total_amount") or 0)

    for p in payments.data or []:
        confirmed = p["confirmed_at"]
        if confirmed is None:
            continue
        confirmed_str = confirmed.isoformat() if hasattr(confirmed, 'isoformat') else str(confirmed)
        month = confirmed_str[:7]  # YYYY-MM
        collected_by_month[month] += float(p.get("amount") or 0)

    # Build last 6 months including zeros
    months = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        d = now - timedelta(days=i * 30)
        months.append(d.strftime("%Y-%m"))

    result = []
    for m in months:
        label = datetime.strptime(m, "%Y-%m").strftime("%b")
        result.append({
            "month": label,
            "revenue": round(revenue_by_month.get(m, 0), 2),
            "collected": round(collected_by_month.get(m, 0), 2),
        })

    return {"history": result}
