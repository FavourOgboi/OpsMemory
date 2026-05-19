"""
OpsMemory — Recommendation Engine (Task B)

Multi-turn agentic recommendation with:
- Cold-start handling: asks preference questions before recommending
- Cross-domain switching: Yelp ↔ Amazon catalog based on conversation
- Behavioral reasoning: explains recommendations using user profile data
- Nigerian Pidgin pass-through

Session lifecycle:
  start_session()  -> creates DB row, first LLM turn
  continue_session() -> loads history, updates preferences, next LLM turn
"""

import json
import uuid
import logging
from app.database import supabase
from app.services.llm_client import get_llm_client, resolve_model

logger = logging.getLogger(__name__)

# ── Cross-domain phrase detection ─────────────────────────────────────────────
# These patterns trigger a switch from yelp -> amazon (or vice versa)
AMAZON_TRIGGERS = [
    "recommend a book", "recommend books", "suggest a book",
    "looking for a book", "any book", "good book to read",
    "product to buy", "something to buy", "online product",
    "electronics", "laptop", "phone recommendation",
]
YELP_TRIGGERS = [
    "restaurant", "food place", "where to eat", "place to dine",
    "good spot", "somewhere to eat", "bar", "coffee shop",
]

def _detect_domain_switch(message: str, current_source: str) -> tuple[str, bool]:
    """Returns (new_source, switched). Avoids false positives like 'I booked a table'."""
    lower = message.lower()
    if current_source == "yelp":
        for trigger in AMAZON_TRIGGERS:
            if trigger in lower:
                return "amazon", True
    else:
        for trigger in YELP_TRIGGERS:
            if trigger in lower:
                return "yelp", True
    return current_source, False


# ── Candidate retrieval ───────────────────────────────────────────────────────

def _get_candidates(source: str, category: str = None, limit: int = 12) -> list:
    """Fetch candidate items from local DB for ranking."""
    q = supabase.table("external_items").select(
        "id, name, category, average_stars, review_count, description, attributes"
    ).eq("source", source).order("review_count", desc=True).limit(limit)

    if category:
        q = q.ilike("category", f"%{category}%")

    result = q.execute()
    return result.data or []


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are OpsMemory's Recommendation Agent — a smart, friendly assistant that recommends
restaurants, businesses, or products from a real dataset.

Your personality:
- Warm and conversational, not robotic
- Ask focused follow-up questions (never more than 2 at once)
- Give concrete, ranked recommendations with brief reasoning
- If the user writes in Pidgin, respond in Pidgin naturally

COLD START PROTOCOL (when user_history is empty):
- Do NOT recommend immediately
- Ask exactly 2 focused preference questions to understand the user
- Only recommend after gathering at least one preference signal

CROSS-DOMAIN:
- If user asks about books/products while you're on restaurants (or vice versa), acknowledge the switch
  and explain you're searching a different catalog
- Update the session source accordingly

RECOMMENDATION FORMAT:
When ready to recommend, always include a JSON block in your response like this:
```json
{
  "recommendations": [
    {"rank": 1, "name": "...", "stars": 4.5, "reasoning": "...based on your preference for..."},
    {"rank": 2, "name": "...", "stars": 4.2, "reasoning": "..."},
    {"rank": 3, "name": "...", "stars": 4.0, "reasoning": "..."}
  ],
  "preferences_gathered": {"food_type": "spicy", "price": "affordable"}
}
```
Your conversational reply goes BEFORE the JSON block. Keep the conversational part SHORT (2-4 sentences).
"""


# ── Main functions ────────────────────────────────────────────────────────────

async def start_session(
    user_id: str = None,
    category: str = None,
    source: str = "yelp",
    initial_message: str = "",
) -> dict:
    """
    Starts a new recommendation session.
    Returns session dict with agent_response and session_id.
    """
    session_id = str(uuid.uuid4())
    is_cold_start = not bool(user_id)

    # Fetch user profile if provided
    user_profile = None
    profile = {}
    if user_id:
        result = supabase.table("external_users").select("*").eq("id", user_id).maybeSingle().execute()
        if result.data:
            user_profile = result.data
            profile = user_profile.get("behavior_profile") or {}

    # Build user context for the prompt
    user_context = _build_user_context_str(profile, is_cold_start)

    # Get candidate items for the LLM to reason over
    candidates = _get_candidates(source, category)
    candidates_text = _format_candidates(candidates)

    # Build conversation
    history = [{"role": "user", "content": initial_message}]

    # Check domain switch
    new_source, switched = _detect_domain_switch(initial_message, source)
    if switched:
        source = new_source
        candidates = _get_candidates(source, category)
        candidates_text = _format_candidates(candidates)

    system = f"{SYSTEM_PROMPT}\n\n{user_context}\n\nAVAILABLE ITEMS:\n{candidates_text}"

    client = get_llm_client("cheap")
    model = resolve_model("cheap")

    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}] + history,
        max_tokens=700,
        temperature=0.5,
    )
    agent_text = resp.choices[0].message.content.strip()

    # Parse recommendations from response
    recs, prefs = _parse_agent_response(agent_text)

    # Build full conversation history
    full_history = [
        {"role": "user", "content": initial_message},
        {"role": "assistant", "content": agent_text},
    ]

    # Store session
    supabase.table("recommendation_sessions").insert({
        "session_id": session_id,
        "user_profile_id": user_id,
        "source": source,
        "category": category,
        "conversation_history": full_history,
        "current_recommendations": recs,
        "is_cold_start": is_cold_start,
        "cross_domain": switched,
        "preferences_gathered": prefs,
        "turn_count": 1,
        "status": "active",
    }).execute()

    return {
        "session_id": session_id,
        "agent_response": agent_text,
        "recommendations": recs,
        "is_cold_start": is_cold_start,
        "cross_domain": switched,
        "source": source,
        "turn": 1,
    }


async def continue_session(session_id: str, user_message: str) -> dict:
    """
    Continue an existing session with a new user message.
    """
    # Load session
    result = (
        supabase.table("recommendation_sessions")
        .select("*")
        .eq("session_id", session_id)
        .maybeSingle()
        .execute()
    )
    if not result.data:
        raise ValueError(f"Session {session_id} not found")

    session = result.data
    history: list = session.get("conversation_history") or []
    prefs: dict = session.get("preferences_gathered") or {}
    source: str = session.get("source", "yelp")
    category: str = session.get("category")
    user_id = session.get("user_profile_id")
    turn = (session.get("turn_count") or 1) + 1

    # Domain switch check
    new_source, switched = _detect_domain_switch(user_message, source)
    if switched:
        source = new_source

    # Get fresh candidates for current source
    candidates = _get_candidates(source, category)
    candidates_text = _format_candidates(candidates)

    # Fetch user profile
    profile = {}
    if user_id:
        ur = supabase.table("external_users").select("behavior_profile").eq("id", user_id).maybeSingle().execute()
        if ur.data:
            profile = ur.data.get("behavior_profile") or {}

    is_cold_start = session.get("is_cold_start", False) and not prefs

    user_context = _build_user_context_str(profile, is_cold_start)
    system = f"{SYSTEM_PROMPT}\n\n{user_context}\n\nAVAILABLE ITEMS:\n{candidates_text}"
    if switched:
        system += f"\n\nNOTE: User asked about a different domain. You have switched to '{source}' catalog."

    # Append new user message
    history.append({"role": "user", "content": user_message})

    client = get_llm_client("cheap")
    model = resolve_model("cheap")

    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}] + history[-12:],  # last 12 turns
        max_tokens=700,
        temperature=0.5,
    )
    agent_text = resp.choices[0].message.content.strip()
    history.append({"role": "assistant", "content": agent_text})

    # Parse recs + new preferences
    new_recs, new_prefs = _parse_agent_response(agent_text)
    merged_prefs = {**prefs, **new_prefs}
    final_recs = new_recs or session.get("current_recommendations") or []

    # Update session
    supabase.table("recommendation_sessions").update({
        "conversation_history": history,
        "current_recommendations": final_recs,
        "preferences_gathered": merged_prefs,
        "source": source,
        "cross_domain": switched or bool(session.get("cross_domain")),
        "turn_count": turn,
        "updated_at": "now()",
    }).eq("session_id", session_id).execute()

    return {
        "session_id": session_id,
        "agent_response": agent_text,
        "recommendations": final_recs,
        "is_cold_start": is_cold_start,
        "cross_domain": switched or bool(session.get("cross_domain")),
        "source": source,
        "turn": turn,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_user_context_str(profile: dict, is_cold_start: bool) -> str:
    if not profile:
        context = "USER PROFILE: New user — no history available. Cold-start mode active."
        if is_cold_start:
            context += "\nASK preference questions before recommending."
        return context

    return f"""USER PROFILE:
- Avg rating given: {profile.get('avg_rating', 3.5)}/5
- Tone: {profile.get('tone', 'balanced')}
- Usually praises: {', '.join(profile.get('common_praises', []))}
- Often complains about: {', '.join(profile.get('common_complaints', []))}
- Writing style: {profile.get('language_style', 'casual')}
Use this profile to personalize your reasoning when recommending."""


def _format_candidates(candidates: list) -> str:
    if not candidates:
        return "No items found in database."
    lines = []
    for i, c in enumerate(candidates[:10], 1):
        attrs = c.get("attributes") or {}
        if isinstance(attrs, str):
            try:
                attrs = json.loads(attrs)
            except Exception:
                attrs = {}
        city = attrs.get("city", "")
        lines.append(
            f"{i}. {c.get('name', 'Unknown')} | {c.get('category', '')} | "
            f"{c.get('average_stars', 0)}★ ({c.get('review_count', 0)} reviews)"
            + (f" | {city}" if city else "")
        )
    return "\n".join(lines)


def _parse_agent_response(text: str) -> tuple[list, dict]:
    """Extract JSON recommendations block from agent response."""
    recs = []
    prefs = {}
    try:
        start = text.find("```json")
        end = text.find("```", start + 7)
        if start != -1 and end != -1:
            json_str = text[start + 7 : end].strip()
            data = json.loads(json_str)
            recs = data.get("recommendations", [])
            prefs = data.get("preferences_gathered", {})
    except Exception:
        pass
    return recs, prefs
