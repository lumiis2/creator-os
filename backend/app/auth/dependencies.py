"""
FastAPI authentication dependencies.

Provides get_current_user dependency that validates JWT and auto-creates user/profile.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import TokenData
from app.auth.service import JWTValidationError, validate_jwt
from app.core.database import get_db
from app.models import Profile, User

logger = logging.getLogger(__name__)

AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]


async def get_current_user_claims(
    authorization: AuthorizationHeader = None,
) -> TokenData:
    """
    Extract and validate Bearer token from Authorization header.

    Args:
        authorization: Authorization header value

    Returns:
        TokenData with validated user_id and email

    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Parse "Bearer <token>" format
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Use: Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = validate_jwt(token.strip())
        return TokenData(user_id=claims.user_id, email=claims.email)
    except JWTValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    token_data: TokenData = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get or create current authenticated user.

    Flow:
    1. Validate JWT token via get_current_user_claims
    2. Extract user_id from token
    3. Look up user in local DB
    4. If not found:
       a. Create new User with supabase_user_id
       b. Create empty Profile for user
    5. Return User object

    Args:
        token_data: Validated token data
        db: Database session

    Returns:
        User object from DB

    Raises:
        HTTPException: 500 if DB operation fails
    """
    try:
        # Try to find existing user by supabase_user_id using ORM
        stmt = select(User).where(User.supabase_user_id == token_data.user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            return user

        # Create new user if not found
        user = User(
            supabase_user_id=token_data.user_id,
            email=token_data.email or f"user-{token_data.user_id}@unknown",
            auth_provider="supabase",
        )
        db.add(user)
        await db.flush()

        # Create empty profile
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.flush()

        await db.commit()
        await db.refresh(user)

        return user

    except Exception as exc:
        await db.rollback()
        logger.exception(f"Error in get_current_user for {token_data.user_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve or create user: {str(exc)}",
        ) from exc


async def get_current_user_id(
    current_user: User = Depends(get_current_user),
) -> UUID:
    """
    Convenience dependency to get only the user ID.

    Args:
        current_user: Current authenticated user

    Returns:
        User ID (UUID)
    """
    return current_user.id
