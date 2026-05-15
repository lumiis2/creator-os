from __future__ import annotations

from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.schemas import TokenData
from ..models import OnboardingState, OnboardingStatus, Profile, User


class UserProvisioningService:
    """Canonical provisioning flow for users, profiles, and onboarding state."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def provision_from_token(self, token_data: TokenData) -> User:
        user = await self._get_or_create_user(token_data)
        profile = await self._get_or_create_profile(user)
        await self._ensure_active_onboarding(profile.id)
        return user

    async def ensure_profile_for_user(self, user: User) -> Profile:
        profile = await self._get_or_create_profile(user)
        await self._ensure_active_onboarding(profile.id)
        return profile

    async def _get_or_create_user(self, token_data: TokenData) -> User:
        stmt = select(User).where(User.supabase_user_id == token_data.user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is not None:
            return cast(User, user)

        user = User(
            supabase_user_id=token_data.user_id,
            email=token_data.email or f"user-{token_data.user_id}@unknown",
            auth_provider="supabase",
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def _get_or_create_profile(self, user: User) -> Profile:
        stmt = select(Profile).where(Profile.user_id == user.id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        if profile is not None:
            return cast(Profile, profile)

        profile = Profile(user_id=user.id, ai_settings={})
        self.db.add(profile)
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def _ensure_active_onboarding(self, profile_id) -> OnboardingState:
        stmt = select(OnboardingState).where(
            OnboardingState.profile_id == profile_id,
            OnboardingState.status == OnboardingStatus.IN_PROGRESS,
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing

        state = OnboardingState(
            profile_id=profile_id,
            version="v1",
            current_step="welcome",
            status=OnboardingStatus.IN_PROGRESS,
        )
        self.db.add(state)
        await self.db.commit()
        await self.db.refresh(state)
        return state