"""Authentication module for CreatorOS."""

from .dependencies import get_current_user, get_current_user_claims, get_current_user_id
from .schemas import (
    AuthStatusResponse,
    FirstAccountOnboarding,
    OnboardingUpdate,
    ProfileRead,
    TokenData,
    UserProfileResponse,
    UserRead,
)
from .service import JWTValidationError, TokenClaims, validate_jwt

__all__ = [
    "JWTValidationError",
    "TokenClaims",
    "validate_jwt",
    "TokenData",
    "UserRead",
    "ProfileRead",
    "UserProfileResponse",
    "AuthStatusResponse",
    "OnboardingUpdate",
    "FirstAccountOnboarding",
    "get_current_user",
    "get_current_user_claims",
    "get_current_user_id",
]
