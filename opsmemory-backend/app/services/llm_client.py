"""
OpsMemory — Unified LLM Client Factory

All model calls go through OpenRouter (OpenAI-compatible API).
"""

from openai import AsyncOpenAI
from app.config import settings

_clients: dict[str, AsyncOpenAI] = {}


def get_llm_client(model_tier: str = "cheap") -> AsyncOpenAI:
    """Returns an AsyncOpenAI client configured for OpenRouter."""
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    tier = model_tier if model_tier in ("cheap", "premium") else "cheap"
    if tier not in _clients:
        _clients[tier] = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
        )
    return _clients[tier]


def get_whisper_client() -> AsyncOpenAI:
    """Transcription via OpenRouter (routes to whisper-capable providers)."""
    return get_llm_client("cheap")


def resolve_model(model_tier: str) -> str:
    if model_tier == "premium":
        return settings.openrouter_model_premium
    return settings.openrouter_model_cheap
