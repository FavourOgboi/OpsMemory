"""
OpsMemory — Onboarding Router

Business registration and WhatsApp connection.
Handles CEO creating a new business, inviting team members,
and connecting a WhatsApp number.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import verify_clerk_token, get_current_user, require_ceo
from app.database import supabase
from app.models.schemas import RegisterBusinessRequest, ConnectWhatsAppRequest, InviteTeamMemberRequest
from app.config import settings
import uuid
import secrets

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/register")
async def register_business(body: RegisterBusinessRequest, auth: dict = Depends(verify_clerk_token)):
    """Creates a new business + CEO user record. Called once during onboarding."""
    # Check if user already has a business
    existing = supabase.table("businesses").select("id").eq("owner_user_id", auth["user_id"]).maybeSingle().execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Business already registered for this account")

    pairing_code = secrets.token_hex(4).upper()
    business = supabase.table("businesses").insert({
        "name": body.name,
        "type": body.type,
        "owner_user_id": auth["user_id"],
        "owner_email": body.owner_email,
        "ceo_phone": body.ceo_phone,
        "deal_approval_threshold": body.deal_approval_threshold,
        "pairing_code": pairing_code,
    }).execute().data[0]

    # Create CEO user record
    supabase.table("business_users").insert({
        "business_id": business["id"],
        "clerk_user_id": auth["user_id"],
        "email": body.owner_email,
        "name": body.owner_name,
        "role": "ceo",
        "phone": body.ceo_phone,
    }).execute()

    return {"business_id": business["id"], "pairing_code": pairing_code, "message": "Business registered successfully"}


@router.post("/connect-whatsapp")
async def connect_whatsapp(body: ConnectWhatsAppRequest, user: dict = Depends(require_ceo)):
    """Connects a WhatsApp number to the business."""
    biz_id = user["business_id"]
    business = supabase.table("businesses").select("*").eq("id", biz_id).single().execute().data
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    webhook_url = f"{settings.base_url}/webhook/{'twilio' if body.use_twilio_sandbox else 'whatsapp'}/{biz_id}"

    supabase.table("businesses").update({
        "whatsapp_number": body.whatsapp_number,
        "whatsapp_connected": True,
        "webhook_url": webhook_url,
    }).eq("id", biz_id).execute()

    return {"webhook_url": webhook_url, "message": "WhatsApp connected successfully. Configure this URL in your Twilio/Meta dashboard."}


@router.post("/invite")
async def invite_team_member(body: InviteTeamMemberRequest, user: dict = Depends(require_ceo)):
    """CEO invites a team member to the business. Creates their business_user record."""
    biz_id = user["business_id"]

    # Check for duplicate email in this business
    existing = supabase.table("business_users").select("id").eq("business_id", biz_id).eq("email", body.email).maybeSingle().execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="User with this email already exists in the business")

    # Validate role
    valid_roles = ["sales", "finance", "operations", "manager"]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")

    member = supabase.table("business_users").insert({
        "business_id": biz_id,
        "clerk_user_id": f"pending_{uuid.uuid4().hex[:8]}",  # Will be updated when user signs up via Clerk
        "email": body.email,
        "name": body.name,
        "role": body.role,
        "phone": body.phone,
    }).execute().data[0]

    return {"member_id": member["id"], "message": f"Invitation sent to {body.email} as {body.role}"}


@router.get("/business")
async def get_business(user: dict = Depends(get_current_user)):
    """Returns the current user's business profile."""
    biz_id = user["business_id"]
    result = supabase.table("businesses").select("*").eq("id", biz_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Business not found")
    return result.data


@router.get("/team")
async def list_team(user: dict = Depends(get_current_user)):
    """Lists all team members for the user's business."""
    biz_id = user["business_id"]
    result = supabase.table("business_users").select("id, name, email, role, phone, active, created_at").eq("business_id", biz_id).order("created_at").execute()
    return result.data


@router.put("/team/{member_id}/role")
async def update_member_role(member_id: str, role: str, user: dict = Depends(require_ceo)):
    """CEO updates a team member's role."""
    biz_id = user["business_id"]
    valid_roles = ["sales", "finance", "operations", "manager"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")
    supabase.table("business_users").update({"role": role}).eq("id", member_id).eq("business_id", biz_id).execute()
    return {"message": "Role updated"}


@router.delete("/team/{member_id}")
async def deactivate_member(member_id: str, user: dict = Depends(require_ceo)):
    """CEO deactivates a team member (soft delete)."""
    biz_id = user["business_id"]
    supabase.table("business_users").update({"active": False}).eq("id", member_id).eq("business_id", biz_id).execute()
    return {"message": "Team member deactivated"}
