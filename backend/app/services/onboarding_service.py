from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import OnboardingState, OnboardingStatus, Profile, SocialAccount
from ..repositories.onboarding_state import OnboardingStateRepository


class OnboardingService:
    """Service for onboarding state persistence and lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OnboardingStateRepository(db)

    async def get_or_create_active_state(
        self,
        profile_id: UUID,
        version: str = "v1",
    ) -> OnboardingState:
        active = await self.repo.get_active_for_profile(profile_id)
        if active is not None:
            return active

        state = OnboardingState(
            profile_id=profile_id,
            version=version,
            current_step="welcome",
            status=OnboardingStatus.IN_PROGRESS,
            last_saved_at=datetime.utcnow(),
        )
        self.db.add(state)
        await self.db.commit()
        await self.db.refresh(state)
        return state

    async def update_active_state(
        self,
        profile_id: UUID,
        version: str | None = None,
        current_step: str | None = None,
        completed_steps: list[str] | None = None,
        payload: dict | None = None,
        state_metadata: dict | None = None,
    ) -> OnboardingState:
        state = await self.get_or_create_active_state(profile_id, version or "v1")

        if version is not None:
            state.version = version
        if current_step is not None:
            state.current_step = current_step
        if completed_steps is not None:
            state.completed_steps = completed_steps
        if payload is not None:
            merged_payload = dict(state.payload or {})
            merged_payload.update(payload)
            state.payload = merged_payload
        if state_metadata is not None:
            merged_metadata = dict(state.state_metadata or {})
            merged_metadata.update(state_metadata)
            state.state_metadata = merged_metadata

        state.last_saved_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(state)
        return state

    async def complete_onboarding(self, profile_id: UUID) -> OnboardingState:
        state = await self.get_or_create_active_state(profile_id)
        state.status = OnboardingStatus.COMPLETED
        state.completed_at = datetime.utcnow()
        state.last_saved_at = datetime.utcnow()

        profile_stmt = select(Profile).where(Profile.id == profile_id)
        profile_result = await self.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        if profile is not None:
            profile.onboarding_completed = True

        await self.db.commit()
        await self.db.refresh(state)
        return state

    async def list_social_connections(self, profile_id: UUID) -> list[SocialAccount]:
        stmt = select(SocialAccount).where(SocialAccount.profile_id == profile_id).order_by(SocialAccount.created_at.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())