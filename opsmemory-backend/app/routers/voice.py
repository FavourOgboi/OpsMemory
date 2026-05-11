"""
OpsMemory — Voice Router

Twilio voice call webhook endpoints. Identifies callers by their registered phone,
scoped to their business. Unregistered callers are rejected.
"""

from fastapi import APIRouter, Form
from fastapi.responses import Response
from app.services.voice import VoiceService
from app.database import supabase
from app.config import settings
import logging

router = APIRouter(prefix="/voice", tags=["voice"])
logger = logging.getLogger(__name__)
voice_service = VoiceService()


@router.post("/incoming")
async def handle_incoming_call(From: str = Form(...), CallSid: str = Form(...)):
    caller_phone = From
    user_result = supabase.table("business_users").select("*, businesses(*)").eq("phone", caller_phone).eq("active", True).maybeSingle().execute()
    if not user_result.data:
        twiml = voice_service.build_reject_twiml("Sorry, this number is not registered with OpsMemory. Please register in the dashboard first.")
        return Response(content=twiml, media_type="application/xml")

    user = user_result.data
    business = user["businesses"]
    user_name = user["name"].split()[0]

    supabase.table("voice_sessions").upsert({
        "call_sid": CallSid,
        "business_id": business["id"],
        "user_id": user["id"],
        "role": user["role"],
        "caller_phone": caller_phone,
    }).execute()

    twiml = voice_service.build_greeting_twiml(
        greeting=f"Welcome back {user_name}. What would you like to know about {business['name']}?",
        callback_url=f"{settings.base_url}/api/voice/respond",
        call_sid=CallSid,
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/respond")
async def handle_voice_response(CallSid: str = Form(...), SpeechResult: str = Form(default=""), Confidence: str = Form(default="0")):
    session = supabase.table("voice_sessions").select("*").eq("call_sid", CallSid).maybeSingle().execute()
    if not session.data:
        twiml = voice_service.build_reject_twiml("Session expired. Please call again.")
        return Response(content=twiml, media_type="application/xml")

    ctx = session.data
    question = SpeechResult.strip()
    if not question or len(question) < 3:
        twiml = voice_service.build_ask_again_twiml("I didn't catch that. Please ask your question again.", callback_url=f"{settings.base_url}/api/voice/respond", call_sid=CallSid)
        return Response(content=twiml, media_type="application/xml")

    answer = await voice_service.answer_question(business_id=ctx["business_id"], role=ctx["role"], question=question)
    twiml = voice_service.build_answer_twiml(answer=answer, callback_url=f"{settings.base_url}/api/voice/respond", call_sid=CallSid)
    return Response(content=twiml, media_type="application/xml")
