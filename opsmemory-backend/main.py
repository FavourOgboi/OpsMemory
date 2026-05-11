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
)
from app.jobs.scheduler import start_scheduler
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start scheduler on startup, cleanup on shutdown."""
    start_scheduler()
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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://opsmemory.vercel.app",
    ],
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


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "OpsMemory Backend", "version": "1.0.0"}
