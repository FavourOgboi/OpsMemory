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
