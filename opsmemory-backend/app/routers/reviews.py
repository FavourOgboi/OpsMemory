"""
OpsMemory — Reviews Router (Task A)

Public endpoints — no auth required so judges can test directly.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.database import supabase
from app.services.review_engine import simulate_from_profile, simulate_from_persona

router = APIRouter(prefix="/reviews", tags=["reviews"])


# ── Request models ────────────────────────────────────────────────────────────

class SimulateProfileRequest(BaseModel):
    user_id: str
    item_id: str
    force_nigerian: bool = False


class PersonaRequest(BaseModel):
    avg_rating: float = 3.5
    tone: Optional[str] = "balanced"
    language_style: Optional[str] = "casual"
    common_praises: Optional[List[str]] = []
    common_complaints: Optional[List[str]] = []
    writing_personality: Optional[str] = None
    nigerian_context: bool = False


class SimulatePersonaRequest(BaseModel):
    persona: PersonaRequest
    item_name: str
    item_category: str
    item_description: Optional[str] = ""
    nigerian_context: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/simulate/profile")
async def simulate_review_from_profile(body: SimulateProfileRequest):
    """
    Task A (core): Simulate a review from a real user profile in the DB.
    Fetches the user's behavioral profile + review history, generates a contextualised review.
    """
    try:
        result = await simulate_from_profile(
            user_id=body.user_id,
            item_id=body.item_id,
            force_nigerian=body.force_nigerian,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review simulation failed: {e}")


@router.post("/simulate/persona")
async def simulate_review_from_persona(body: SimulatePersonaRequest):
    """
    Task A (judge eval): Simulate a review from a free-form persona dict.
    No DB lookup needed — works without ingesting data.
    """
    try:
        result = await simulate_from_persona(
            persona=body.persona.model_dump(),
            item_name=body.item_name,
            item_category=body.item_category,
            item_description=body.item_description or "",
            nigerian_context=body.nigerian_context or body.persona.nigerian_context,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona simulation failed: {e}")


@router.get("/users")
async def list_users(
    source: str = Query("yelp", description="Data source: yelp or amazon"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    nigerian_only: bool = Query(False),
):
    """List external user profiles available for review simulation."""
    q = (
        supabase.table("external_users")
        .select("id, external_id, source, name, review_count, average_stars, behavior_profile, nigerian_signals")
        .eq("source", source)
        .order("review_count", desc=True)
        .limit(limit)
        .offset(offset)
    )
    if nigerian_only:
        q = q.eq("nigerian_signals", True)
    result = q.execute()
    return result.data or []


@router.get("/items")
async def list_items(
    source: str = Query("yelp"),
    category: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List external items (businesses / products) available for review simulation."""
    q = (
        supabase.table("external_items")
        .select("id, external_id, source, name, category, average_stars, review_count, description, attributes")
        .eq("source", source)
        .order("review_count", desc=True)
        .limit(limit)
        .offset(offset)
    )
    if category:
        q = q.ilike("category", f"%{category}%")
    result = q.execute()
    return result.data or []


@router.get("/generated")
async def list_generated_reviews(limit: int = Query(10, ge=1, le=50)):
    """Recent AI-generated reviews (for the frontend history panel)."""
    result = (
        supabase.table("generated_reviews")
        .select(
            "id, predicted_stars, review_text, language, nigerian_context, reasoning, confidence, created_at, "
            "external_users(external_id, average_stars), external_items(name, category)"
        )
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


@router.get("/demo/suggest")
async def demo_suggestions():
    """
    4 curated demo profiles for the frontend to surface on first load.
    Covers: enthusiast, critic, Nigerian context, cold-start persona.
    """
    # Try to pull real users from DB
    enthusiast = (
        supabase.table("external_users")
        .select("id, external_id, average_stars, behavior_profile, nigerian_signals")
        .eq("source", "yelp")
        .gte("average_stars", 4.0)
        .order("review_count", desc=True)
        .limit(1)
        .execute()
    ).data

    critic = (
        supabase.table("external_users")
        .select("id, external_id, average_stars, behavior_profile, nigerian_signals")
        .eq("source", "yelp")
        .lte("average_stars", 2.5)
        .order("review_count", desc=True)
        .limit(1)
        .execute()
    ).data

    nigerian = (
        supabase.table("external_users")
        .select("id, external_id, average_stars, behavior_profile, nigerian_signals")
        .eq("source", "yelp")
        .eq("nigerian_signals", True)
        .limit(1)
        .execute()
    ).data

    return {
        "enthusiast": enthusiast[0] if enthusiast else None,
        "critic": critic[0] if critic else None,
        "nigerian": nigerian[0] if nigerian else None,
        "cold_start": {
            "persona": {
                "avg_rating": 3.5,
                "tone": "balanced",
                "language_style": "casual",
                "writing_personality": "New user — no history",
                "nigerian_context": True,
            },
            "label": "Nigerian cold-start persona",
        },
    }
