"""
OpsMemory — Local Authentication System

Database-backed auth with bcrypt password hashing and JWT tokens.
Replaces Clerk for local development and hackathon deployment.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.database import supabase
from app.config import settings
import bcrypt
import jwt
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


# ── Request / Response models ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict


# ── Password helpers ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ──────────────────────────────────────────────────────────────

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Auth dependency (replaces Clerk's verify_clerk_token) ────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verifies the JWT token and returns user context.
    Supports both the new local auth tokens AND legacy dev tokens.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    # Try local JWT first
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        email = payload.get("email", "")

        # Look up business association
        biz_user = supabase.table("business_users") \
            .select("business_id, role") \
            .eq("app_user_id", user_id) \
            .eq("active", True) \
            .maybeSingle() \
            .execute()

        if biz_user.data:
            return {
                "user_id": user_id,
                "email": email,
                "business_id": str(biz_user.data["business_id"]),
                "role": biz_user.data["role"],
            }

        # User exists but no business yet (pre-onboarding)
        return {
            "user_id": user_id,
            "email": email,
            "business_id": None,
            "role": "ceo",
        }

    except HTTPException:
        raise
    except Exception:
        pass

    # Fallback: try legacy dev JWT (no signature verification)
    if settings.app_env == "development":
        try:
            from jose import jwt as jose_jwt
            payload = jose_jwt.decode(token, "", options={"verify_signature": False})
            return {
                "user_id": payload.get("sub", "demo-user"),
                "email": payload.get("email", ""),
                "business_id": payload.get("public_metadata", {}).get("business_id"),
                "role": payload.get("public_metadata", {}).get("role", "ceo"),
            }
        except Exception:
            pass

    raise HTTPException(status_code=401, detail="Invalid authentication")


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[dict]:
    """Like get_current_user but returns None instead of raising."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def require_ceo(user: dict = Depends(get_current_user)) -> dict:
    """Restricts endpoint access to CEO / owner role only."""
    if user["role"] not in ["ceo", "owner"]:
        raise HTTPException(status_code=403, detail="CEO access required")
    return user


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest):
    """Create a new user account."""
    # Check if email already exists
    existing = supabase.table("app_users") \
        .select("id") \
        .eq("email", body.email.lower().strip()) \
        .maybeSingle() \
        .execute()

    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Validate password
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Create user
    user_id = str(uuid.uuid4())
    hashed = hash_password(body.password)

    supabase.table("app_users").insert({
        "id": user_id,
        "email": body.email.lower().strip(),
        "password_hash": hashed,
        "name": body.name.strip(),
        "phone": body.phone,
    }).execute()

    # Create user preferences
    supabase.table("user_preferences").insert({
        "user_id": user_id,
        "tour_completed": False,
        "onboarding_completed": False,
    }).execute()

    # Generate token
    token = create_token(user_id, body.email.lower().strip())

    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": body.email.lower().strip(),
            "name": body.name.strip(),
            "phone": body.phone,
        },
    }


@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate and return a JWT token."""
    user = supabase.table("app_users") \
        .select("id, email, name, phone, password_hash") \
        .eq("email", body.email.lower().strip()) \
        .maybeSingle() \
        .execute()

    if not user.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(body.password, user.data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(str(user.data["id"]), user.data["email"])

    # Check onboarding status
    prefs = supabase.table("user_preferences") \
        .select("onboarding_completed, tour_completed") \
        .eq("user_id", str(user.data["id"])) \
        .maybeSingle() \
        .execute()

    return {
        "token": token,
        "user": {
            "id": str(user.data["id"]),
            "email": user.data["email"],
            "name": user.data["name"],
            "phone": user.data.get("phone"),
        },
        "onboarding_completed": prefs.data.get("onboarding_completed", False) if prefs.data else False,
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the current user's profile + onboarding status."""
    app_user = supabase.table("app_users") \
        .select("id, email, name, phone") \
        .eq("id", user["user_id"]) \
        .maybeSingle() \
        .execute()

    prefs = supabase.table("user_preferences") \
        .select("onboarding_completed, tour_completed") \
        .eq("user_id", user["user_id"]) \
        .maybeSingle() \
        .execute()

    # Check if user has a business
    biz = supabase.table("businesses") \
        .select("id, name, onboarding_completed, onboarding_step") \
        .eq("owner_user_id", user["user_id"]) \
        .maybeSingle() \
        .execute()

    return {
        "user": app_user.data if app_user.data else {"id": user["user_id"], "email": user["email"]},
        "business": biz.data,
        "preferences": prefs.data if prefs.data else {"onboarding_completed": False, "tour_completed": False},
        "has_business": bool(biz.data),
        "onboarding_completed": biz.data.get("onboarding_completed", False) if biz.data else False,
    }
