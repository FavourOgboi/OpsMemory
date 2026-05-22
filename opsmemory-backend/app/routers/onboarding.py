"""
OpsMemory — Onboarding Router

Business registration and WhatsApp connection.
Handles CEO creating a new business, inviting team members,
and connecting a WhatsApp number.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import verify_clerk_token, get_current_user, require_ceo
from app.database import supabase
from app.models.schemas import RegisterBusinessRequest, ConnectWhatsAppRequest, InviteTeamMemberRequest, UpdateBusinessMemoryRequest
from app.config import settings
from app.services.onboarding_knowledge import sync_onboarding_to_knowledge
import uuid
import secrets
import logging

logger = logging.getLogger(__name__)

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


@router.put("/memory")
async def update_business_memory(body: UpdateBusinessMemoryRequest, user: dict = Depends(require_ceo)):
    """
    CEO updates the business memory — name, description, website, social links, catalogue links.
    These values are stored in the businesses table and surfaced to the AI agents
    as context (so agents know the business website, Instagram, etc.).
    """
    biz_id = user["business_id"]
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    supabase.table("businesses").update(updates).eq("id", biz_id).execute()
    return {"message": "Business memory updated", "updated_fields": list(updates.keys())}


# ── New onboarding endpoints for 6-step flow ─────────────────────────────────


def _business_fields_from_body(body: dict, *, step: int, completed: bool = False) -> dict:
    """Map onboarding form JSON to businesses table columns."""
    return {
        "name": body.get("business_name") or "My Business",
        "type": body.get("business_type") or "services",
        "website_url": body.get("website_url"),
        "instagram_handle": body.get("instagram_handle"),
        "other_link": body.get("other_link"),
        "whatsapp_number": body.get("whatsapp_number"),
        "catalog_url": body.get("catalog_url"),
        "business_description": body.get("business_description"),
        "products_text": body.get("products_text"),
        "deal_approval_threshold": body.get("deal_threshold", 100000),
        "auto_reply_enabled": body.get("auto_reply_enabled", True),
        "city": body.get("city"),
        "agent_languages": body.get("agent_languages") or ["english", "pidgin"],
        "onboarding_step": step,
        "onboarding_completed": completed,
    }


def _ensure_ceo_membership(biz_id: str, user: dict, owner_name: str) -> None:
    """Link app user to business as CEO (local auth uses app_user_id)."""
    uid = user["user_id"]
    existing = (
        supabase.table("business_users")
        .select("id")
        .eq("business_id", biz_id)
        .eq("app_user_id", uid)
        .maybeSingle()
        .execute()
    )
    if existing.data:
        return
    row = {
        "business_id": biz_id,
        "app_user_id": uid,
        "clerk_user_id": uid,
        "email": user.get("email", ""),
        "name": owner_name or "Owner",
        "role": "ceo",
    }
    try:
        supabase.table("business_users").insert(row).execute()
    except Exception as exc:
        logger.warning("CEO membership insert: %s", exc)


async def _upsert_business_from_onboarding(
    user: dict,
    body: dict,
    *,
    step: int,
    completed: bool = False,
) -> str:
    user_id = user["user_id"]
    fields = _business_fields_from_body(body, step=step, completed=completed)

    existing = (
        supabase.table("businesses")
        .select("id")
        .eq("owner_user_id", user_id)
        .maybeSingle()
        .execute()
    )

    if existing.data:
        biz_id = str(existing.data["id"])
        supabase.table("businesses").update(fields).eq("id", biz_id).execute()
    else:
        pairing_code = secrets.token_hex(4).upper()
        insert_row = {
            **fields,
            "owner_user_id": user_id,
            "owner_email": user.get("email", ""),
            "pairing_code": pairing_code,
        }
        result = supabase.table("businesses").insert(insert_row).execute()
        biz_id = str(result.data[0]["id"])

    _ensure_ceo_membership(biz_id, user, body.get("owner_name", "Owner"))
    return biz_id


@router.post("/save-progress")
async def save_onboarding_progress(body: dict, user: dict = Depends(get_current_user)):
    """
    Persist onboarding form data as the owner moves through steps.
    Step 4+ also syncs catalog text into knowledge_base for WhatsApp RAG.
    """
    step = int(body.get("step") or 1)
    biz_id = await _upsert_business_from_onboarding(user, body, step=step, completed=False)

    knowledge_synced = False
    if step >= 4 or body.get("products_text") or body.get("business_description"):
        try:
            await sync_onboarding_to_knowledge(biz_id, body)
            knowledge_synced = True
        except Exception as exc:
            logger.error("Onboarding knowledge sync failed: %s", exc)

    return {
        "business_id": biz_id,
        "step": step,
        "knowledge_synced": knowledge_synced,
        "message": "Progress saved",
    }


@router.post("/complete")
async def complete_onboarding(body: dict, user: dict = Depends(get_current_user)):
    """Complete onboarding — persist business + index knowledge for WhatsApp."""
    user_id = user["user_id"]
    biz_id = await _upsert_business_from_onboarding(
        user, body, step=6, completed=True
    )

    knowledge_counts = {}
    try:
        knowledge_counts = await sync_onboarding_to_knowledge(biz_id, body)
    except Exception as exc:
        logger.error("Final onboarding knowledge sync failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Business saved but knowledge indexing failed: {exc}",
        ) from exc

    try:
        supabase.table("user_preferences").update({
            "onboarding_completed": True,
        }).eq("user_id", user_id).execute()
    except Exception:
        pass

    return {
        "business_id": biz_id,
        "message": "Onboarding completed",
        "knowledge_indexed": knowledge_counts,
    }


@router.post("/connect-whatsapp-simple")
async def connect_whatsapp_simple(body: dict):
    """Simplified WhatsApp connection for onboarding (no full auth required)."""
    number = body.get("whatsapp_number", "")
    if not number:
        raise HTTPException(status_code=400, detail="WhatsApp number is required")

    # In dev, simulate success
    return {"connected": True, "number": number, "message": "WhatsApp connected"}

