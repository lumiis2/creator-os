"""Pydantic schemas for authentication and user/profile responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from ..schemas.types import NicheData


class TokenData(BaseModel):
    """JWT token parsed data."""
    
    user_id: UUID
    email: str | None = None


class UserRead(BaseModel):
    """User model for API responses."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    auth_provider: str
    created_at: datetime
    updated_at: datetime


class ProfileRead(BaseModel):
    """Profile model for API responses."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    niche: str | None = None
    creator_goal: str | None = None
    posting_frequency_goal: int | None = None
    ai_behavior: dict = Field(default_factory=dict)
    ai_settings: dict = Field(default_factory=dict)
    global_strategy: str | None = None
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(BaseModel):
    """Profile update payload."""
    
    niche: str | None = None
    creator_goal: str | None = None
    posting_frequency_goal: int | None = None
    ai_behavior: dict | None = None
    onboarding_completed: bool | None = None


class FirstAccountOnboarding(BaseModel):
    """First social account details during onboarding."""
    
    platform: str
    platform_handle: str
    platform_user_id: str
    credentials: dict = Field(default_factory=dict)
    niche_data: NicheData = Field(default_factory=NicheData)


class OnboardingUpdate(BaseModel):
    """Onboarding payload with profile and first social account data.
    
    Note: full_name, avatar_url updates should be done via User model,
    not Profile model. This schema only handles Profile-specific fields.
    """
    
    # Profile fields
    niche: str | None = None
    creator_goal: str | None = None
    posting_frequency_goal: int | None = None
    ai_behavior: dict = Field(default_factory=dict)
    global_strategy: str | None = None
    
    # First social account (optional)
    first_account: FirstAccountOnboarding | None = None


class UserProfileResponse(BaseModel):
    """Combined user and profile response."""
    
    user: UserRead
    profile: ProfileRead


class AuthStatusResponse(BaseModel):
    """Auth system health check response."""
    
    status: str = "ok"
    environment: str
    auth_configured: bool
    message: str | None = None
