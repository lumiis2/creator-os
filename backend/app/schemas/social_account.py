from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import PlatformType
from .base import ORMBase
from .types import NicheData


class SocialAccountCreate(ORMBase):
    user_id: UUID
    platform: PlatformType
    platform_handle: str
    platform_user_id: str
    credentials: dict = Field(default_factory=dict)
    niche_data: NicheData = Field(default_factory=NicheData)


class SocialAccountRead(ORMBase):
    id: UUID
    user_id: UUID
    platform: PlatformType
    platform_handle: str
    platform_user_id: str
    credentials: dict
    niche_data: NicheData
    created_at: datetime
    updated_at: datetime
