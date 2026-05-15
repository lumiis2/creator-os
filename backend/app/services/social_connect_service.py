from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.crypto import encrypt_token
from app.models import PlatformAccountType, PlatformType, SocialAccount, SocialAccountStatus


class SocialConnectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_social_account(
        self,
        *,
        profile_id: UUID,
        platform: PlatformType,
        platform_user_id: str,
        platform_handle: str,
        platform_account_name: str | None,
        platform_account_url: str | None,
        platform_account_type: PlatformAccountType | None,
        access_token: str | None,
        refresh_token: str | None,
        expires_in: int | None,
        scopes: list[str],
        platform_metadata: dict[str, Any],
    ) -> SocialAccount:
        stmt = select(SocialAccount).where(
            SocialAccount.profile_id == profile_id,
            SocialAccount.platform == platform,
            SocialAccount.platform_user_id == platform_user_id,
        )
        result = await self.db.execute(stmt)
        account = result.scalar_one_or_none()

        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        if account is None:
            account = SocialAccount(
                profile_id=profile_id,
                platform=platform,
                platform_user_id=platform_user_id,
                platform_handle=platform_handle,
                platform_account_name=platform_account_name,
                platform_account_url=platform_account_url,
                platform_account_type=platform_account_type,
                access_token=encrypt_token(access_token),
                refresh_token=encrypt_token(refresh_token),
                expires_at=expires_at,
                scopes=scopes,
                status=SocialAccountStatus.CONNECTED,
                needs_reconnect=False,
                platform_metadata=platform_metadata,
                credentials={},
                niche_data={},
            )
            self.db.add(account)
        else:
            account.platform_handle = platform_handle
            account.platform_account_name = platform_account_name
            account.platform_account_url = platform_account_url
            account.platform_account_type = platform_account_type
            account.access_token = encrypt_token(access_token)
            account.refresh_token = encrypt_token(refresh_token)
            account.expires_at = expires_at
            account.scopes = scopes
            account.status = SocialAccountStatus.CONNECTED
            account.needs_reconnect = False
            account.platform_metadata = platform_metadata

        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def exchange_google_code(self, code: str) -> dict[str, Any]:
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
            raise ValueError("Google OAuth is not configured")

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()

    async def fetch_youtube_channel(self, access_token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "id,snippet", "mine": "true"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            data = response.json()
            items = data.get("items", [])
            if not items:
                raise ValueError("No YouTube channel found")
            return items[0]

    async def exchange_meta_code(self, code: str) -> dict[str, Any]:
        if not settings.META_APP_ID or not settings.META_APP_SECRET or not settings.META_REDIRECT_URI:
            raise ValueError("Meta OAuth is not configured")

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://graph.facebook.com/v20.0/oauth/access_token",
                params={
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "redirect_uri": settings.META_REDIRECT_URI,
                    "code": code,
                },
            )
            response.raise_for_status()
            return response.json()

    async def fetch_meta_pages(self, access_token: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://graph.facebook.com/v20.0/me/accounts",
                params={
                    "fields": "id,name,access_token,instagram_business_account",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json().get("data", [])

    async def fetch_instagram_profile(self, ig_user_id: str, access_token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"https://graph.facebook.com/v20.0/{ig_user_id}",
                params={"fields": "id,username,profile_picture_url,account_type"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()
