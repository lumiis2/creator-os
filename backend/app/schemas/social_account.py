from datetime import datetime
from uuid import UUID

from pydantic import Field

from ..models.enums import PlatformAccountType, PlatformType, SocialAccountStatus
from .base import ORMBase


class SocialAccountCreate(ORMBase):
    profile_id: UUID
    platform: PlatformType
    platform_handle: str
    platform_user_id: str
    status: SocialAccountStatus = SocialAccountStatus.CONNECTED
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None
    scopes: list[str] = Field(default_factory=list)
    credentials: dict = Field(default_factory=dict)
    last_sync_at: datetime | None = None
    last_error: str | None = None
    needs_reconnect: bool = False
    platform_account_type: PlatformAccountType | None = None
    platform_account_name: str | None = None
    platform_account_url: str | None = None
    platform_metadata: dict = Field(default_factory=dict)
    niche_data: dict = Field(default_factory=dict)


class SocialAccountRead(ORMBase):
    id: UUID
    profile_id: UUID
    platform: PlatformType
    platform_handle: str
    platform_user_id: str
    status: SocialAccountStatus
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None
    scopes: list[str]
    credentials: dict
    last_sync_at: datetime | None = None
    last_error: str | None = None
    needs_reconnect: bool
    platform_account_type: PlatformAccountType | None = None
    platform_account_name: str | None = None
    platform_account_url: str | None = None
    platform_metadata: dict
    niche_data: dict
    created_at: datetime
    updated_at: datetime
