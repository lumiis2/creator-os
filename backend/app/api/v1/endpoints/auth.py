"""
Authentication API routes for CreatorOS.

Endpoints:
- GET /auth/me - Current user + profile
- GET /auth/health - Auth system health check
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    get_current_user,
    get_current_user_id,
    UserProfileResponse,
    AuthStatusResponse,
    UserRead,
    ProfileRead,
)
from app.core.database import get_db
from app.core.config import settings
from app.models import User, Profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Get current authenticated user and their profile.
    
    Requires: Valid Bearer JWT token in Authorization header.
    
    Returns:
        User and Profile data
        
    Raises:
        401: Invalid or missing token
        404: User not found (shouldn't happen)
    """
    # Refresh to get relationships
    await db.refresh(current_user, ["profile"])
    
    profile = current_user.profile
    if not profile:
        # Shouldn't happen, but ensure profile exists
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    
    return UserProfileResponse(
        user=UserRead.model_validate(current_user),
        profile=ProfileRead.model_validate(profile),
    )


@router.get("/health", response_model=AuthStatusResponse, status_code=status.HTTP_200_OK)
async def health_check() -> AuthStatusResponse:
    """
    Check authentication system health and configuration status.
    
    Returns:
        AuthStatusResponse with status, environment, and auth configuration.
        
    Note:
        This endpoint does NOT require authentication.
        It's useful for checking if the auth system is properly configured.
    """
    auth_configured = bool(
        settings.SUPABASE_JWT_SECRET
        or settings.SUPABASE_JWT_PUBLIC_KEY
        or settings.SUPABASE_JWKS_URL
    )
    
    message = None
    if not auth_configured:
        message = (
            "Warning: Auth not configured. Set SUPABASE_JWKS_URL, "
            "SUPABASE_JWT_SECRET, or SUPABASE_JWT_PUBLIC_KEY."
        )
    
    return AuthStatusResponse(
        status="ok",
        environment=settings.ENVIRONMENT.value,
        auth_configured=auth_configured,
        message=message,
    )
