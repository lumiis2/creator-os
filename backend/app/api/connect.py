from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import PlatformAccountType, PlatformType, User
from app.services.oauth_state import decode_state, encode_state
from app.services.social_connect_service import SocialConnectService
from app.services.user_provisioning_service import UserProvisioningService

router = APIRouter(prefix="/connect", tags=["connect"])

YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

META_SCOPES = [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
]


@router.get("/youtube")
async def connect_youtube(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    provisioner = UserProvisioningService(db)
    profile = await provisioner.ensure_profile_for_user(current_user)

    state = encode_state({
        "profile_id": str(profile.id),
        "provider": "youtube",
        "ts": datetime.utcnow().timestamp(),
    })

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(YOUTUBE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    url = "https://accounts.google.com/o/oauth2/v2/auth?" + "&".join(
        f"{key}={quote(str(value))}" for key, value in params.items()
    )

    return {"url": url}


@router.get("/youtube/callback")
async def youtube_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        data = decode_state(state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    profile_id = data.get("profile_id")
    if not profile_id:
        raise HTTPException(status_code=400, detail="Invalid state")
    profile_uuid = UUID(profile_id)

    service = SocialConnectService(db)
    token_data = await service.exchange_google_code(code)

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    scope_str = token_data.get("scope", "")
    scopes = scope_str.split() if scope_str else YOUTUBE_SCOPES

    channel = await service.fetch_youtube_channel(access_token)
    snippet = channel.get("snippet", {})
    channel_id = channel.get("id")
    title = snippet.get("title")
    custom_url = snippet.get("customUrl") or ""
    thumb = snippet.get("thumbnails", {}).get("default", {}).get("url")

    platform_handle = custom_url or title or channel_id
    platform_url = f"https://www.youtube.com/channel/{channel_id}" if channel_id else None

    await service.upsert_social_account(
        profile_id=profile_uuid,
        platform=PlatformType.YOUTUBE,
        platform_user_id=channel_id,
        platform_handle=platform_handle,
        platform_account_name=title,
        platform_account_url=platform_url,
        platform_account_type=PlatformAccountType.CHANNEL,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        scopes=scopes,
        platform_metadata={"channel": channel, "thumbnail": thumb},
    )

    return RedirectResponse(f"{settings.FRONTEND_URL}/onboarding?connected=youtube")


@router.get("/meta")
async def connect_meta(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.META_APP_ID or not settings.META_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Meta OAuth is not configured")

    provisioner = UserProvisioningService(db)
    profile = await provisioner.ensure_profile_for_user(current_user)

    state = encode_state({
        "profile_id": str(profile.id),
        "provider": "meta",
        "ts": datetime.utcnow().timestamp(),
    })

    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "response_type": "code",
        "scope": ",".join(META_SCOPES),
        "state": state,
    }

    url = "https://www.facebook.com/v20.0/dialog/oauth?" + "&".join(
        f"{key}={quote(str(value))}" for key, value in params.items()
    )

    return {"url": url}


@router.get("/meta/callback")
async def meta_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        data = decode_state(state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    profile_id = data.get("profile_id")
    if not profile_id:
        raise HTTPException(status_code=400, detail="Invalid state")
    profile_uuid = UUID(profile_id)

    service = SocialConnectService(db)
    token_data = await service.exchange_meta_code(code)

    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in")
    scopes = META_SCOPES

    pages = await service.fetch_meta_pages(access_token)
    if not pages:
        raise HTTPException(status_code=400, detail="No Facebook pages found")

    for page in pages:
        page_id = page.get("id")
        page_name = page.get("name")
        page_token = page.get("access_token")

        if page_id and page_name:
            await service.upsert_social_account(
                profile_id=profile_uuid,
                platform=PlatformType.FACEBOOK,
                platform_user_id=page_id,
                platform_handle=page_name,
                platform_account_name=page_name,
                platform_account_url=None,
                platform_account_type=PlatformAccountType.PAGE,
                access_token=page_token or access_token,
                refresh_token=None,
                expires_in=expires_in,
                scopes=scopes,
                platform_metadata={"page": page},
            )

        ig_account = page.get("instagram_business_account") or {}
        ig_id = ig_account.get("id")
        if ig_id and page_token:
            ig_profile = await service.fetch_instagram_profile(ig_id, page_token)
            ig_username = ig_profile.get("username")
            await service.upsert_social_account(
                profile_id=profile_uuid,
                platform=PlatformType.INSTAGRAM,
                platform_user_id=str(ig_id),
                platform_handle=ig_username or str(ig_id),
                platform_account_name=ig_username,
                platform_account_url=(
                    f"https://www.instagram.com/{ig_username}/" if ig_username else None
                ),
                platform_account_type=PlatformAccountType.BUSINESS,
                access_token=page_token,
                refresh_token=None,
                expires_in=expires_in,
                scopes=scopes,
                platform_metadata={"instagram": ig_profile, "page": page},
            )

    return RedirectResponse(f"{settings.FRONTEND_URL}/onboarding?connected=meta")
