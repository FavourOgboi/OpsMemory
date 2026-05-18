"""
OpsMemory — Application Settings
Loads all configuration from environment variables via .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str

    # ── OpenRouter (all LLM + embeddings + transcription) ─────────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model_cheap: str = "openai/gpt-4o-mini"
    openrouter_model_premium: str = "anthropic/claude-sonnet-4-20250514"
    openrouter_whisper_model: str = "openai/whisper-1"
    openrouter_embedding_model: str = "openai/text-embedding-3-small"

    # ── Clerk ─────────────────────────────────────────────────────────────
    clerk_secret_key: str
    clerk_publishable_key: str
    clerk_jwt_issuer: str

    # ── Meta WhatsApp Business API ────────────────────────────────────────
    meta_whatsapp_token: str
    meta_whatsapp_verify_token: str
    meta_phone_number_id: str
    meta_business_account_id: str
    meta_graph_api_version: str = "v25.0"
    meta_app_secret: str = ""  # Meta App Secret — used for webhook HMAC (not the access token)

    # Outbound WhatsApp: meta | twilio | auto (auto prefers Meta when configured)
    whatsapp_provider: str = "auto"

    # ── Twilio ────────────────────────────────────────────────────────────
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_whatsapp_number: str
    twilio_voice_number: str

    # ── ElevenLabs ────────────────────────────────────────────────────────
    elevenlabs_api_key: str
    elevenlabs_voice_id: str

    # ── SMTP ──────────────────────────────────────────────────────────────
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_from_name: str
    smtp_from_email: str

    # ── App ───────────────────────────────────────────────────────────────
    app_env: str = "development"
    base_url: str
    secret_key: str

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
