from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import OnboardingStatus
from .base import ORMBase
from .social_account import SocialAccountRead


class OnboardingStateRead(ORMBase):
    id: UUID
    profile_id: UUID
    version: str
    current_step: str | None = None
    completed_steps: list[str] = Field(default_factory=list)
    payload: dict = Field(default_factory=dict)
    status: OnboardingStatus
    started_at: datetime
    completed_at: datetime | None = None
    last_saved_at: datetime
    state_metadata: dict = Field(default_factory=dict, serialization_alias="metadata")


class OnboardingStateUpdate(ORMBase):
    version: str | None = None
    current_step: str | None = None
    completed_steps: list[str] | None = None
    payload: dict | None = None
    state_metadata: dict | None = Field(default=None, validation_alias="metadata", serialization_alias="metadata")


class OnboardingCompleteResponse(ORMBase):
    state: OnboardingStateRead


class OnboardingSocialStatusRead(ORMBase):
    profile_id: UUID
    connections: list[SocialAccountRead] = Field(default_factory=list)