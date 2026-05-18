"""
OpsMemory — Customers Router

Customer CRUD endpoints. All queries scoped to the user's business_id.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import supabase, get_customer_by_id, update_customer
from app.models.schemas import UpdateCustomerRequest

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/")
async def list_customers(user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    query = supabase.table("customers").select("*").eq("business_id", biz_id).order("total_revenue", desc=True)
    if user["role"] == "sales":
        ur = supabase.table("business_users").select("id").eq("clerk_user_id", user["user_id"]).eq("business_id", biz_id).single().execute()
        if ur.data:
            query = query.eq("assigned_to", ur.data["id"])
    return query.execute().data


@router.get("/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    c = await get_customer_by_id(user["business_id"], customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.put("/{customer_id}")
async def update_customer_endpoint(customer_id: str, body: UpdateCustomerRequest, user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    existing = await get_customer_by_id(biz_id, customer_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    if body.assigned_to and user["role"] not in ["ceo", "manager"]:
        raise HTTPException(status_code=403, detail="Only CEO or Manager can reassign customers")
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    return await update_customer(biz_id, customer_id, updates)


@router.get("/{customer_id}/timeline")
async def get_customer_timeline(customer_id: str, user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    c = await get_customer_by_id(biz_id, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    events = supabase.table("live_events").select("*").eq("business_id", biz_id).eq("customer_id", customer_id).order("created_at", desc=True).limit(50).execute()
    actions = supabase.table("agent_actions").select("*").eq("business_id", biz_id).eq("customer_id", customer_id).order("created_at", desc=True).limit(20).execute()
    orders = supabase.table("orders").select("*").eq("business_id", biz_id).eq("customer_id", customer_id).order("created_at", desc=True).limit(20).execute()
    return {"customer": c, "events": events.data, "agent_actions": actions.data, "orders": orders.data}


@router.get("/{customer_id}/insights")
async def get_customer_insights(customer_id: str, user: dict = Depends(get_current_user)):
    """Returns AI-generated insights (risk, opportunity, pattern) based on real customer data."""
    biz_id = user["business_id"]
    c = await get_customer_by_id(biz_id, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Build simple heuristic insights from real data
    insights = []

    # Risk insight
    if c.get("churn_risk") in ["high", "critical"]:
        insights.append({
            "id": f"insight-risk-{customer_id}",
            "type": "risk",
            "title": f"{c.get('name')} at {c.get('churn_risk')} churn risk",
            "description": f"Customer health score is {c.get('health_score', 0)}/100. Last order was {c.get('days_since_last_order', 'unknown')} days ago. Immediate attention recommended.",
            "confidence": 0.92,
            "evidence": f"Health score {c.get('health_score', 0)}/100 and {c.get('days_since_last_order', 'unknown')} days since last order.",
            "recommendedAction": "Reach out with a check-in offer",
            "severity": "critical" if c.get('churn_risk') == "critical" else "warning",
        })

    # Opportunity insight
    if c.get("total_revenue", 0) > 500000 and c.get("payment_behavior_score", 0) >= 80:
        insights.append({
            "id": f"insight-upsell-{customer_id}",
            "type": "opportunity",
            "title": f"{c.get('name')} is a premium upsell candidate",
            "description": f"Lifetime value ₦{c.get('total_revenue', 0):,.0f} with strong payment reliability. Ideal for bulk discount or premium product introduction.",
            "confidence": 0.88,
            "evidence": f"Payment behavior score {c.get('payment_behavior_score', 0)}/100 and ₦{c.get('total_revenue', 0):,.0f} lifetime revenue.",
            "recommendedAction": "Introduce premium product line",
            "severity": "positive",
        })

    # Pattern insight — outstanding balance
    outstanding = c.get("outstanding_balance", 0)
    if outstanding > 100000:
        insights.append({
            "id": f"insight-outstanding-{customer_id}",
            "type": "pattern",
            "title": "Significant outstanding balance",
            "description": f"₦{outstanding:,.0f} outstanding. Review credit terms and consider partial upfront payment for next order.",
            "confidence": 0.95,
            "evidence": f"₦{outstanding:,.0f} currently unpaid across {c.get('open_invoices', 0)} open invoice(s).",
            "recommendedAction": "Review credit terms",
            "severity": "warning",
        })
    elif outstanding == 0 and c.get("total_revenue", 0) > 200000:
        insights.append({
            "id": f"insight-loyal-{customer_id}",
            "type": "pattern",
            "title": "Reliable payment pattern",
            "description": "Zero outstanding with high lifetime value. Consider loyalty rewards to deepen relationship.",
            "confidence": 0.85,
            "evidence": "Zero outstanding balance with consistent order history.",
            "recommendedAction": "Offer loyalty discount",
            "severity": "positive",
        })

    # Pattern insight — ordering frequency
    order_freq = c.get("order_frequency_days", 0)
    if order_freq > 0 and c.get("days_since_last_order", 0) > order_freq * 1.5:
        insights.append({
            "id": f"insight-frequency-{customer_id}",
            "type": "pattern",
            "title": "Order gap detected",
            "description": f"Customer usually orders every {order_freq} days but it's now been {c.get('days_since_last_order', 0)} days.",
            "confidence": 0.79,
            "evidence": f"Average order cycle: {order_freq} days. Current gap: {c.get('days_since_last_order', 0)} days.",
            "recommendedAction": "Send re-engagement message",
            "severity": "warning",
        })

    if not insights:
        insights.append({
            "id": f"insight-steady-{customer_id}",
            "type": "pattern",
            "title": "Steady customer",
            "description": "No significant risks or opportunities detected at this time.",
            "confidence": 0.7,
            "evidence": "Metrics within normal ranges.",
            "recommendedAction": "Maintain regular contact",
            "severity": "info",
        })

    return {"customer": c, "insights": insights}
