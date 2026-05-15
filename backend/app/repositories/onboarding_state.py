from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import OnboardingState, OnboardingStatus


class OnboardingStateRepository:
    """Repository helpers for onboarding state queries."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_for_profile(self, profile_id: UUID) -> OnboardingState | None:
        stmt = select(OnboardingState).where(
            OnboardingState.profile_id == profile_id,
            OnboardingState.status == OnboardingStatus.IN_PROGRESS,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()