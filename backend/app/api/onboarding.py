from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas import (
    OnboardingCompleteResponse,
    OnboardingSocialStatusRead,
    OnboardingStateRead,
    OnboardingStateUpdate,
    SocialAccountRead,
)
from app.services.onboarding_service import OnboardingService
from app.services.user_provisioning_service import UserProvisioningService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/state", response_model=OnboardingStateRead)
async def get_onboarding_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provisioner = UserProvisioningService(db)
    profile = await provisioner.ensure_profile_for_user(current_user)

    service = OnboardingService(db)
    state = await service.get_or_create_active_state(profile.id)
    return OnboardingStateRead.model_validate(state)


@router.patch("/state", response_model=OnboardingStateRead)
async def patch_onboarding_state(
    payload: OnboardingStateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provisioner = UserProvisioningService(db)
    profile = await provisioner.ensure_profile_for_user(current_user)

    service = OnboardingService(db)
    state = await service.update_active_state(
        profile_id=profile.id,
        version=payload.version,
        current_step=payload.current_step,
        completed_steps=payload.completed_steps,
        payload=payload.payload,
        state_metadata=payload.state_metadata,
    )
    return OnboardingStateRead.model_validate(state)


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provisioner = UserProvisioningService(db)
    profile = await provisioner.ensure_profile_for_user(current_user)

    service = OnboardingService(db)
    state = await service.complete_onboarding(profile.id)
    return OnboardingCompleteResponse(state=OnboardingStateRead.model_validate(state))


@router.get("/social/status", response_model=OnboardingSocialStatusRead)
async def get_social_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provisioner = UserProvisioningService(db)
    profile = await provisioner.ensure_profile_for_user(current_user)

    service = OnboardingService(db)
    connections = await service.list_social_connections(profile.id)
    return OnboardingSocialStatusRead(
        profile_id=profile.id,
        connections=[SocialAccountRead.model_validate(conn) for conn in connections],
    )