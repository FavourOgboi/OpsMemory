"""
OpsMemory — Authentication Middleware

Uses local JWT auth (database-backed).
Injects the user's business_id and role into every authenticated request.
Ensures strict tenant isolation — a user can only access their own business data.
"""

from app.routers.local_auth import get_current_user, get_current_user_optional, require_ceo

# Re-export for backward compatibility with all routers that import from app.auth
# Legacy aliases
verify_clerk_token = get_current_user

def require_role(allowed_roles: list):
    """Factory for role-based access control."""
    from fastapi import Depends, HTTPException
    async def check_role(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access restricted to: {', '.join(allowed_roles)}",
            )
        return user
    return check_role
