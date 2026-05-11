"""
OpsMemory — Voice Service

TwiML builders and GPT-4o-mini-powered spoken answer generation.
Queries the Supabase memory layer for the caller's business context.
"""

from openai import AsyncOpenAI
from app.config import settings
from app.database import supabase

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

VOICE_QUERY_PROMPT = """You are OpsMemory, an AI voice assistant for a Nigerian business.
Someone from the business team is calling to ask about their operations.
Answer concisely — this is a phone call, not a chat. Maximum 3 sentences.
Speak naturally, not robotically. Numbers should be spoken: ₦470,000 = "four hundred and seventy thousand naira".
Role: {role}

Business data context:
{context}

Question: {question}

Answer in 2-3 spoken sentences maximum."""


class VoiceService:
    def build_greeting_twiml(self, greeting: str, callback_url: str, call_sid: str) -> str:
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{greeting}</Say>
    <Gather input="speech" action="{callback_url}" method="POST" speechTimeout="auto" language="en-NG"></Gather>
</Response>'''

    def build_answer_twiml(self, answer: str, callback_url: str, call_sid: str) -> str:
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{answer}</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">Is there anything else you'd like to know?</Say>
    <Gather input="speech" action="{callback_url}" method="POST" speechTimeout="auto" language="en-NG"></Gather>
    <Say voice="Polly.Joanna">Alright, goodbye. Have a great day.</Say>
</Response>'''

    def build_reject_twiml(self, message: str) -> str:
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{message}</Say>
    <Hangup/>
</Response>'''

    def build_ask_again_twiml(self, message: str, callback_url: str, call_sid: str) -> str:
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{message}</Say>
    <Gather input="speech" action="{callback_url}" method="POST" speechTimeout="auto" language="en-NG"></Gather>
</Response>'''

    async def answer_question(self, business_id: str, role: str, question: str) -> str:
        context_parts = []
        customers = supabase.table("customers").select("name, outstanding_balance, churn_risk, days_since_last_order").eq("business_id", business_id).execute()
        if customers.data:
            outstanding_total = sum(c.get("outstanding_balance", 0) for c in customers.data)
            high_risk = [c["name"] for c in customers.data if c.get("churn_risk") in ["high", "critical"]]
            context_parts.append(f"Total outstanding: ₦{outstanding_total:,.0f}")
            context_parts.append(f"Total customers: {len(customers.data)}")
            if high_risk:
                context_parts.append(f"High churn risk customers: {', '.join(high_risk)}")
        approvals = supabase.table("agent_actions").select("agent_name, trigger_summary").eq("business_id", business_id).eq("status", "pending").execute()
        if approvals.data:
            context_parts.append(f"Pending approvals: {len(approvals.data)}")

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": VOICE_QUERY_PROMPT.format(role=role, context="\n".join(context_parts), question=question)}],
            max_tokens=100,
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()
