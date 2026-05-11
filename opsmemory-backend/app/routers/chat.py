"""
OpsMemory — Intelligence Chat Router

Natural language query against business memory. Role-based scope filtering.
"""

from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.database import supabase
from app.models.schemas import ChatQueryRequest, ChatQueryResponse
from openai import AsyncOpenAI
from app.config import settings
import json

router = APIRouter(prefix="/chat", tags=["chat"])
client = AsyncOpenAI(api_key=settings.openai_api_key)

ROLE_SCOPE = {
    "ceo": "You can see everything: all customers, all finances, all agents, all staff performance.",
    "sales": "You can only see your assigned customers' data — conversations, orders, churn risk.",
    "finance": "You can see all payment data, invoice states, and financial records. Not operational or customer conversation data.",
    "operations": "You can see delivery status, task queue, vendor data. Not financial or sales data.",
    "manager": "You can see your team's full data.",
}


@router.post("/query")
async def query_intelligence(body: ChatQueryRequest, user: dict = Depends(get_current_user)):
    biz_id = user["business_id"]
    role = body.role or user["role"]

    context = {}
    if role in ["ceo", "finance", "manager"]:
        customers = supabase.table("customers").select("name, business_name, outstanding_balance, churn_risk, total_revenue, days_since_last_order").eq("business_id", biz_id).execute()
        context["customers"] = customers.data
        pending = supabase.table("agent_actions").select("agent_name, trigger_summary, proposed_action, confidence").eq("business_id", biz_id).eq("status", "pending").execute()
        context["pending_actions"] = pending.data
    elif role == "sales":
        ur = supabase.table("business_users").select("id").eq("clerk_user_id", user["user_id"]).eq("business_id", biz_id).maybeSingle().execute()
        if ur.data:
            customers = supabase.table("customers").select("name, business_name, outstanding_balance, churn_risk, total_revenue").eq("business_id", biz_id).eq("assigned_to", ur.data["id"]).execute()
            context["my_customers"] = customers.data

    system_prompt = f"""You are an intelligent business assistant for an operational platform.
The user is a {role}. {ROLE_SCOPE.get(role, "")}
Answer their question using the data provided. Be concise. Give the direct answer first, then supporting detail.
Format numbers in Nigerian Naira: ₦150,000 (not 150000). If the data is not available, say so honestly.
Business data: {json.dumps(context, indent=2)}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": body.question}],
        max_tokens=200,
        temperature=0.3,
    )
    return ChatQueryResponse(answer=response.choices[0].message.content.strip(), table_data=None)
