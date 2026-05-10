from __future__ import annotations

from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Profile, SocialAccount
from ..repositories.base import BaseRepository
from ..auth.schemas import OnboardingUpdate


class ProfileService:
    """Business logic for profile creation, sync, and onboarding."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.profile_repo = BaseRepository(db, Profile)
        self.social_account_repo = BaseRepository(db, SocialAccount)

    async def get_or_create_profile(self, user_id: UUID) -> Profile:
        profile = await self.profile_repo.get_by_id(user_id)
        if profile is not None:
            return profile

        await self._ensure_auth_user_exists(user_id)

        profile = Profile(id=user_id, ai_settings={})
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_profile_context(self, user_id: UUID) -> tuple[Profile, list[SocialAccount]]:
        profile = await self.get_or_create_profile(user_id)
        accounts = await self.get_connected_social_accounts(user_id)
        return profile, accounts

    async def get_connected_social_accounts(self, user_id: UUID) -> list[SocialAccount]:
        stmt = select(SocialAccount).where(SocialAccount.user_id == user_id).order_by(SocialAccount.created_at.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_onboarding(self, user_id: UUID, payload: OnboardingUpdate) -> tuple[Profile, list[SocialAccount]]:
        profile = await self.get_or_create_profile(user_id)

        # Update only Profile-specific fields (NOT User fields like full_name)
        if payload.niche is not None:
            profile.niche = payload.niche
        if payload.creator_goal is not None:
            profile.creator_goal = payload.creator_goal
        if payload.posting_frequency_goal is not None:
            profile.posting_frequency_goal = payload.posting_frequency_goal
        if payload.ai_behavior:
            profile.ai_behavior = payload.ai_behavior
        if payload.global_strategy is not None:
            profile.global_strategy = payload.global_strategy
        
        profile.onboarding_completed = True

        if payload.first_account is not None:
            await self._upsert_first_social_account(user_id, payload.first_account)

        await self.db.commit()
        await self.db.refresh(profile)
        accounts = await self.get_connected_social_accounts(user_id)
        return profile, accounts

    async def _upsert_first_social_account(self, user_id: UUID, first_account) -> SocialAccount:
        stmt = select(SocialAccount).where(
            SocialAccount.user_id == user_id,
            SocialAccount.platform == first_account.platform,
            SocialAccount.platform_user_id == first_account.platform_user_id,
        )
        result = await self.db.execute(stmt)
        account = result.scalar_one_or_none()

        if account is None:
            account = SocialAccount(
                user_id=user_id,
                platform=first_account.platform,
                platform_handle=first_account.platform_handle,
                platform_user_id=first_account.platform_user_id,
                credentials=first_account.credentials,
                niche_data=first_account.niche_data.model_dump(mode="json"),
            )
            self.db.add(account)
            await self.db.flush()
            return account

        account.platform_handle = first_account.platform_handle
        account.credentials = first_account.credentials
        account.niche_data = first_account.niche_data.model_dump(mode="json")
        await self.db.flush()
        return account

    async def _ensure_auth_user_exists(self, user_id: UUID) -> None:
        """Create a minimal auth.users row for local Docker if it does not exist.

        In Supabase production, the auth user should already exist. This is mainly
        for the local Docker database where we emulate Supabase auth with a dummy table.
        """
        exists_stmt = text("SELECT 1 FROM auth.users WHERE id = :user_id LIMIT 1")
        result = await self.db.execute(exists_stmt, {"user_id": user_id})
        if result.first() is not None:
            return

        insert_stmt = text("INSERT INTO auth.users (id) VALUES (:user_id) ON CONFLICT (id) DO NOTHING")
        await self.db.execute(insert_stmt, {"user_id": user_id})
        await self.db.flush()

    async def get_profile_or_404(self, user_id: UUID) -> Profile:
        profile = await self.profile_repo.get_by_id(user_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found.",
            )
        return profile
