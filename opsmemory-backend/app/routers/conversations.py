"""
OpsMemory — Conversations Router

CRUD for conversations. Role-based filtering:
- CEO/Manager: see all conversations
- Sales: only see conversations assigned to them
- Finance/Operations: see all but read-only context

Every query is scoped to the user's business_id.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.database import supabase
from app.models.schemas import SendReplyRequest
from app.services.whatsapp import send_whatsapp_message

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("/")
async def list_conversations(user: dict = Depends(get_current_user)):
    """Returns all conversations for the user's business, filtered by role."""
    biz_id = user["business_id"]

    query = (
        supabase.table("conversations")
        .select(
            "*, customers(name, business_name, health_score, churn_risk, language)"
        )
        .eq("business_id", biz_id)
        .order("last_message_at", desc=True)
    )

    # Sales reps only see their assigned conversations
    if user["role"] == "sales":
        user_record = (
            supabase.table("business_users")
            .select("id")
            .eq("clerk_user_id", user["user_id"])
            .eq("business_id", biz_id)
            .single()
            .execute()
        )
        if user_record.data:
            query = query.eq("assigned_to", user_record.data["id"])

    result = query.limit(50).execute()
    return result.data


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Returns full conversation with messages, customer profile, and agent recommendation."""
    biz_id = user["business_id"]

    conv = (
        supabase.table("conversations")
        .select("*, customers(*)")
        .eq("id", conversation_id)
        .eq("business_id", biz_id)  # Tenant isolation
        .single()
        .execute()
    )
    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .eq("business_id", biz_id)  # Double-check isolation
        .order("created_at")
        .execute()
    )

    # Get latest pending agent action for this customer
    agent_rec = (
        supabase.table("agent_actions")
        .select("*")
        .eq("customer_id", conv.data["customer_id"])
        .eq("business_id", biz_id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    # Mark as read
    supabase.table("conversations").update({"unread_count": 0}).eq(
        "id", conversation_id
    ).eq("business_id", biz_id).execute()

    return {
        "conversation": conv.data,
        "messages": messages.data,
        "customer": conv.data.get("customers"),
        "agent_recommendation": agent_rec.data[0] if agent_rec.data else None,
    }


@router.post("/{conversation_id}/reply")
async def send_reply(
    conversation_id: str,
    body: SendReplyRequest,
    user: dict = Depends(get_current_user),
):
    """Employee sends a reply to a customer via WhatsApp."""
    biz_id = user["business_id"]

    conv = (
        supabase.table("conversations")
        .select("*, customers(phone, language)")
        .eq("id", conversation_id)
        .eq("business_id", biz_id)
        .single()
        .execute()
    )
    if not conv.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    customer = conv.data["customers"]
    business = (
        supabase.table("businesses")
        .select("*")
        .eq("id", biz_id)
        .single()
        .execute()
        .data
    )
    user_record = (
        supabase.table("business_users")
        .select("id")
        .eq("clerk_user_id", user["user_id"])
        .eq("business_id", biz_id)
        .single()
        .execute()
        .data
    )

    # Send via WhatsApp
    sent = await send_whatsapp_message(business, customer["phone"], body.message)

    # Store outbound message
    supabase.table("messages").insert({
        "business_id": biz_id,
        "conversation_id": conversation_id,
        "customer_id": conv.data["customer_id"],
        "direction": "outbound",
        "content": body.message,
        "media_type": "text",
        "sent_by": user_record["id"] if user_record else None,
    }).execute()

    # Update conversation
    supabase.table("conversations").update({
        "last_message": body.message[:100],
        "last_message_at": "now()",
    }).eq("id", conversation_id).eq("business_id", biz_id).execute()

    return {"sent": sent}
