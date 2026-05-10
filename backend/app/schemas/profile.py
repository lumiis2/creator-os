from datetime import datetime
from uuid import UUID

from pydantic import Field

from .base import ORMBase
from .types import AISettings


class ProfileCreate(ORMBase):
    """Create payload for profile (used in onboarding flow)."""
    
    niche: str | None = None
    creator_goal: str | None = None
    posting_frequency_goal: int | None = None
    ai_behavior: dict = Field(default_factory=dict)
    ai_settings: dict = Field(default_factory=dict)
    global_strategy: str | None = None
    onboarding_completed: bool = False


class ProfileUpdate(ORMBase):
    """Update payload for profile."""
    
    niche: str | None = None
    creator_goal: str | None = None
    posting_frequency_goal: int | None = None
    ai_behavior: dict | None = None
    ai_settings: dict | None = None
    global_strategy: str | None = None
    onboarding_completed: bool | None = None


class ProfileRead(ORMBase):
    """Profile read response (reflects Profile model fields)."""
    
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
