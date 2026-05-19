"""
OpsMemory — Recommendations Router (Task B)

Public endpoints — no auth required so judges can test the multi-turn
cold-start and cross-domain recommendation flows directly.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import supabase
from app.services.recommendation_engine import start_session, continue_session

router = APIRouter(prefix="/recommend", tags=["recommendations"])


# ── Request models ────────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    message: str
    source: str = "yelp"          # "yelp" or "amazon"
    category: Optional[str] = None
    user_id: Optional[str] = None  # External user ID (from external_users table)


class ContinueSessionRequest(BaseModel):
    session_id: str
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_recommendation_session(body: StartSessionRequest):
    """
    Task B: Start a new multi-turn recommendation session.
    - If user_id is provided: uses their behavioral profile for personalised recommendations.
    - If no user_id: activates cold-start mode — agent asks preference questions first.
    - Cross-domain: if message mentions books/products while source=yelp, agent switches catalogs.
    """
    try:
        result = await start_session(
            user_id=body.user_id,
            category=body.category,
            source=body.source,
            initial_message=body.message,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session start failed: {e}")


@router.post("/continue")
async def continue_recommendation_session(body: ContinueSessionRequest):
    """
    Task B: Continue an active recommendation session with a follow-up message.
    Merges new preference signals, updates recommendations, handles domain switching.
    """
    try:
        result = await continue_session(
            session_id=body.session_id,
            user_message=body.message,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session continue failed: {e}")


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Retrieve full session history (for debugging or frontend state recovery)."""
    result = (
        supabase.table("recommendation_sessions")
        .select("*")
        .eq("session_id", session_id)
        .maybeSingle()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data
