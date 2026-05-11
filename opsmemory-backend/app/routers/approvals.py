"""
OpsMemory — Approvals Router

Agent action approval/rejection endpoints. All scoped to business_id.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import supabase, get_pending_approvals
from app.models.schemas import ApproveActionRequest, RejectActionRequest
from app.services.whatsapp import send_whatsapp_message

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("/")
async def list_approvals(user: dict = Depends(get_current_user)):
    return await get_pending_approvals(user["business_id"])


@router.post("/{action_id}/approve")
async def approve_action(action_id: str, body: ApproveActionRequest, user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    action = supabase.table("agent_actions").select("*, customers(phone, language)").eq("id", action_id).eq("business_id", biz_id).single().execute()
    if not action.data:
        raise HTTPException(status_code=404, detail="Action not found")

    ur = supabase.table("business_users").select("id").eq("clerk_user_id", user["user_id"]).eq("business_id", biz_id).maybeSingle().execute()
    business = supabase.table("businesses").select("*").eq("id", biz_id).single().execute().data

    outcome = "Action approved and logged."
    if action.data.get("proposed_message") and action.data.get("customers"):
        customer = action.data["customers"]
        sent = await send_whatsapp_message(business, customer["phone"], action.data["proposed_message"])
        outcome = "WhatsApp message sent successfully." if sent else "WhatsApp send failed — please send manually."

    supabase.table("agent_actions").update({
        "status": "executed",
        "approved_by": ur.data["id"] if ur and ur.data else None,
        "approved_at": "now()",
        "outcome": outcome,
    }).eq("id", action_id).eq("business_id", biz_id).execute()

    supabase.table("live_events").insert({
        "business_id": biz_id,
        "customer_id": action.data.get("customer_id"),
        "event_type": "action_approved",
        "severity": "positive",
        "title": f"{action.data['agent_name']} action approved",
        "description": outcome,
        "agent_name": action.data["agent_name"],
        "resolved": True,
    }).execute()

    return {"status": "executed", "outcome": outcome}


@router.post("/{action_id}/reject")
async def reject_action(action_id: str, body: RejectActionRequest, user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    ur = supabase.table("business_users").select("id").eq("clerk_user_id", user["user_id"]).eq("business_id", biz_id).maybeSingle().execute()
    supabase.table("agent_actions").update({
        "status": "rejected",
        "approved_by": ur.data["id"] if ur and ur.data else None,
        "approved_at": "now()",
        "rejection_reason": body.reason,
    }).eq("id", action_id).eq("business_id", biz_id).execute()
    return {"status": "rejected"}
