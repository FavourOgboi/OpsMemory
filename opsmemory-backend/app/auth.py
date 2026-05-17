"""
OpsMemory — Authentication Middleware

Verifies Clerk JWTs from the Authorization header.
Injects the user's business_id and role into every authenticated request.
Ensures strict tenant isolation — a user can only access their own business data.
"""

from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from app.config import settings
from app.database import supabase
from typing import Optional

security = HTTPBearer()


async def get_clerk_public_keys():
    """Fetch Clerk JWKS for production token verification."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.clerk_jwt_issuer}/.well-known/jwks.json"
        )
        return resp.json()


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verifies the Clerk JWT from the Authorization header.
    Returns the decoded payload containing:
    - sub: Clerk user ID
    - email: user email
    - metadata: includes business_id and role (set in Clerk public metadata)
    """
    token = credentials.credentials
    try:
        # Dev mode: decode without signature verification for rapid iteration
        # Prod mode: fetch JWKS and verify properly
        if settings.app_env == "development":
            payload = jwt.decode(
                token,
                "",
                options={"verify_signature": False},
            )
        else:
            jwks = await get_clerk_public_keys()
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                issuer=settings.clerk_jwt_issuer,
            )

        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email", ""),
            "business_id": payload.get("public_metadata", {}).get("business_id"),
            "role": payload.get("public_metadata", {}).get("role", "sales"),
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(auth: dict = Depends(verify_clerk_token)) -> dict:
    """
    Returns the current authenticated user with their business context.
    This is the primary auth dependency — use it in every protected endpoint.
    The business_id in the returned dict is the ONLY business this user can access.
    """
    if not auth.get("business_id"):
        # Check if user has a business_user record as a fallback
        user_record = supabase.table("business_users") \
            .select("business_id, role") \
            .eq("clerk_user_id", auth["user_id"]) \
            .eq("active", True) \
            .maybeSingle() \
            .execute()
        if user_record.data:
            auth["business_id"] = str(user_record.data["business_id"])
            auth["role"] = user_record.data["role"]
        else:
            raise HTTPException(
                status_code=403,
                detail="No business associated with this account",
            )
    return auth


async def require_ceo(user: dict = Depends(get_current_user)) -> dict:
    """Restricts endpoint access to CEO / owner role only."""
    if user["role"] not in ["ceo", "owner"]:
        raise HTTPException(status_code=403, detail="CEO access required")
    return user


def require_role(allowed_roles: list):
    """Factory for role-based access control."""
    async def check_role(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access restricted to: {', '.join(allowed_roles)}",
            )
        return user
    return check_role
