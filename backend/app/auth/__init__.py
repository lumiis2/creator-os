"""Authentication module for CreatorOS."""

from .service import JWTValidationError, TokenClaims, validate_jwt
from .schemas import (
    TokenData,
    UserRead,
    ProfileRead,
    UserProfileResponse,
    AuthStatusResponse,
    OnboardingUpdate,
    FirstAccountOnboarding,
)
from .dependencies import get_current_user, get_current_user_claims, get_current_user_id

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
