"""
OpsMemory — Review Intelligence Engine (Task A)

Simulates authentic user reviews based on behavioral profiles.
Supports two modes:
  1. simulate_from_profile: fetch real user from DB + their review history -> LLM
  2. simulate_from_persona: free-form persona dict -> LLM (no DB needed)

Returns: {predicted_stars, review_text, language, reasoning, confidence}
"""

import json
import logging
from app.database import supabase
from app.services.llm_client import get_llm_client, resolve_model
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ── Core prompts ──────────────────────────────────────────────────────────────

def _build_system_prompt(nigerian: bool) -> str:
    base = """You are a behavioral review simulation system. Given a user profile and item details,
generate an authentic review that EXACTLY matches how that specific person writes.

You MUST return valid JSON only. No preamble, no markdown. Exactly this structure:
{
  "predicted_stars": <integer 1-5>,
  "review_text": "<the full review, written as if the user wrote it>",
  "language": "english" or "pidgin" or "mixed",
  "reasoning": "<one sentence explaining star rating based on profile patterns>",
  "confidence": <float 0.5-0.99>
}

Rules:
- Match the user's avg_rating tendency (if they tend to rate 4-5, lean toward positive)
- Mirror their writing style: tone, vocabulary, review length
- Reference specific item details naturally (don't be generic)
- Keep reasoning factual: "user rates X category highly + item has Y attribute"
"""
    if nigerian:
        base += """
NIGERIAN PIDGIN MODE ACTIVE:
- Write the review in Nigerian Pidgin English
- Use phrases like: "oga", "abeg", "e don do", "e good sha", "na wa o", "chop well", "price dey reasonable"
- Keep the Pidgin authentic — not caricature
- Language field = "pidgin"
"""
    return base


def _build_user_context(profile: dict, sample_reviews: list) -> str:
    parts = [
        f"User avg_rating: {profile.get('avg_rating', 3.5)}/5",
        f"Tone: {profile.get('tone', 'balanced')}",
        f"Writing style: {profile.get('language_style', 'casual')}",
        f"Personality: {profile.get('writing_personality', 'standard reviewer')}",
        f"Avg review length: {profile.get('review_length_avg', 80)} words",
    ]
    if profile.get("common_praises"):
        parts.append(f"Usually praises: {', '.join(profile['common_praises'])}")
    if profile.get("common_complaints"):
        parts.append(f"Often complains about: {', '.join(profile['common_complaints'])}")

    context = "USER PROFILE:\n" + "\n".join(f"- {p}" for p in parts)

    if sample_reviews:
        context += "\n\nUSER'S ACTUAL PAST REVIEWS (for style matching — do NOT copy verbatim):\n"
        for i, rev in enumerate(sample_reviews[:5], 1):
            text = rev.get("review_text", rev.get("text", ""))
            stars = rev.get("stars", "?")
            context += f"\n[Review {i} - {stars}★]\n{text}\n"

    return context


# ── Public interface ──────────────────────────────────────────────────────────

async def simulate_from_profile(user_id: str, item_id: str, force_nigerian: bool = False) -> dict:
    """
    Fetch user + item + their review history from DB, then generate an AI review.
    Stores the result in generated_reviews table.
    """
    # Fetch user
    user_result = supabase.table("external_users").select("*").eq("id", user_id).maybeSingle().execute()
    if not user_result.data:
        raise ValueError(f"User {user_id} not found")
    user = user_result.data
    profile = user.get("behavior_profile") or {}

    # Fetch item
    item_result = supabase.table("external_items").select("*").eq("id", item_id).maybeSingle().execute()
    if not item_result.data:
        raise ValueError(f"Item {item_id} not found")
    item = item_result.data

    # Fetch up to 5 actual past reviews from this user for style matching
    reviews_result = (
        supabase.table("external_reviews")
        .select("stars, review_text")
        .eq("user_id", user_id)
        .limit(5)
        .execute()
    )
    sample_reviews = reviews_result.data or []

    # Build prompt
    nigerian = force_nigerian or bool(user.get("nigerian_signals")) or bool(profile.get("nigerian_context"))
    system_prompt = _build_system_prompt(nigerian)
    user_context = _build_user_context(profile, sample_reviews)

    item_desc = (
        f"Item: {item.get('name', 'Unknown')}\n"
        f"Category: {item.get('category', 'General')}\n"
        f"Platform avg rating: {item.get('average_stars', 0)}/5 from {item.get('review_count', 0)} reviews\n"
        f"Description: {item.get('description', '')[:300]}"
    )
    if item.get("attributes"):
        attrs = item["attributes"]
        if isinstance(attrs, dict):
            item_desc += f"\nKey attributes: {json.dumps(attrs)[:200]}"

    user_message = f"{user_context}\n\n{item_desc}\n\nGenerate this user's review of the item above."

    client = get_llm_client("cheap")
    model = resolve_model("cheap")

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=500,
        temperature=0.55,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    try:
        result = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        result = json.loads(raw[start : end + 1]) if start != -1 else {}

    # Ensure integer stars
    result["predicted_stars"] = round(float(result.get("predicted_stars", 3)))

    # Store in DB
    try:
        supabase.table("generated_reviews").insert({
            "user_profile_id": user_id,
            "item_id": item_id,
            "predicted_stars": result["predicted_stars"],
            "review_text": result.get("review_text", ""),
            "language": result.get("language", "english"),
            "nigerian_context": nigerian,
            "reasoning": result.get("reasoning", ""),
            "confidence": result.get("confidence", 0.75),
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to store generated review: {e}")

    return {
        **result,
        "user_id": user_id,
        "item_id": item_id,
        "item_name": item.get("name"),
        "nigerian_mode": nigerian,
    }


async def simulate_from_persona(
    persona: dict,
    item_name: str,
    item_category: str,
    item_description: str = "",
    nigerian_context: bool = False,
) -> dict:
    """
    Generate a review from a free-form persona dict (no DB lookup).
    Used for judge evaluation and the demo endpoint.

    persona schema:
    {
      "avg_rating": 4.2,
      "tone": "enthusiastic",
      "language_style": "casual",
      "common_praises": ["great atmosphere"],
      "writing_personality": "Writes long positive reviews with lots of exclamation marks"
    }
    """
    nigerian = nigerian_context or persona.get("nigerian_context", False)
    system_prompt = _build_system_prompt(nigerian)

    profile = {
        "avg_rating": persona.get("avg_rating", 3.5),
        "tone": persona.get("tone", "balanced"),
        "language_style": persona.get("language_style", "casual"),
        "writing_personality": persona.get("writing_personality", "Standard reviewer"),
        "review_length_avg": persona.get("review_length_avg", 80),
        "common_praises": persona.get("common_praises", []),
        "common_complaints": persona.get("common_complaints", []),
        "nigerian_context": nigerian,
    }
    user_context = _build_user_context(profile, [])

    item_desc = (
        f"Item: {item_name}\nCategory: {item_category}\n"
        f"Description: {item_description[:400]}"
    )
    user_message = f"{user_context}\n\n{item_desc}\n\nGenerate this user's review of the item above."

    client = get_llm_client("cheap")
    model = resolve_model("cheap")

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=500,
        temperature=0.55,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    try:
        result = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        result = json.loads(raw[start : end + 1]) if start != -1 else {}

    result["predicted_stars"] = round(float(result.get("predicted_stars", 3)))
    result["item_name"] = item_name
    result["nigerian_mode"] = nigerian
    return result
