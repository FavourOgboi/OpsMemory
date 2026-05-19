"""
OpsMemory — FastAPI Application Entry Point

Wires together all routers, CORS middleware, and the background scheduler.
Start with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import (
    webhook,
    conversations,
    customers,
    approvals,
    analytics,
    chat,
    voice,
    passport,
    onboarding,
    knowledge,
    finance,
    reviews,
    recommendations,
    local_auth,
)
from app.jobs.scheduler import start_scheduler
from app.config import settings
import logging

logger = logging.getLogger(__name__)
DEMO_BUSINESS_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start scheduler on startup, cleanup on shutdown."""
    start_scheduler()
    base = (settings.base_url or "http://localhost:8000").rstrip("/")
    logger.info("Meta webhook:  %s/webhook/whatsapp/%s", base, DEMO_BUSINESS_ID)
    logger.info("Twilio webhook: %s/webhook/twilio/%s", base, DEMO_BUSINESS_ID)
    yield


app = FastAPI(
    title="OpsMemory API",
    description="Operational intelligence backend for Nigerian SMEs",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Webhooks are mounted at root level (no /api prefix) for external services
app.include_router(webhook.router)

# All authenticated API endpoints under /api
app.include_router(conversations.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(approvals.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(passport.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(knowledge.router, prefix="/api")
app.include_router(finance.router, prefix="/api")

# ── Auth (local — replaces Clerk) ──────────────────────────────────────────────
app.include_router(local_auth.router, prefix="/api")

# ── Hackathon: Task A + Task B (public — no auth) ─────────────────────────────
app.include_router(reviews.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")


# ── Health check ──────────────────────────────────────────────────────────────

from app.database import supabase

@app.get("/health")
async def health():
    try:
        # Quick Supabase connectivity check
        result = supabase.table("businesses").select("id", count="exact").limit(1).execute()
        return {
            "status": "ok",
            "service": "OpsMemory Backend",
            "version": "1.0.0",
            "database": "connected",
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "OpsMemory Backend",
            "version": "1.0.0",
            "database": "disconnected",
            "error": str(e),
        }
