"""Tests for authentication endpoints and JWT validation."""

import uuid
from unittest.mock import patch

import pytest
from jwt import InvalidTokenError
from fastapi import HTTPException
from sqlalchemy import select

from app.auth.dependencies import get_current_user_claims, get_current_user
from app.auth.schemas import TokenData
from app.auth.service import validate_jwt, JWTValidationError
from app.models import User, Profile


# ============================================================================
# JWT Validation Tests
# ============================================================================

class TestJWTValidation:
    """Test JWT token validation with different modes (JWKS, public key, secret)."""

    def test_validate_jwt_missing_config(self):
        """Test JWT validation fails when no auth config is set."""
        with patch("app.auth.service.settings") as mock_settings:
            mock_settings.SUPABASE_JWT_SECRET = None
            mock_settings.SUPABASE_JWT_PUBLIC_KEY = None
            mock_settings.SUPABASE_JWKS_URL = None

            with pytest.raises(JWTValidationError, match="configuration is missing"):
                validate_jwt("test-token")

    def test_validate_jwt_with_secret_mocked(self):
        """Test JWT validation using shared secret (HS256) - mocked jwt.decode."""
        test_user_id = str(uuid.uuid4())
        test_email = "user@example.com"

        with patch("app.auth.service.settings") as mock_settings:
            with patch("app.auth.service.jwt.decode") as mock_decode:
                mock_settings.SUPABASE_JWT_SECRET = "test-secret"
                mock_settings.SUPABASE_JWT_PUBLIC_KEY = None
                mock_settings.SUPABASE_JWKS_URL = None
                mock_settings.JWT_ALGORITHM = "HS256"
                mock_settings.SUPABASE_JWT_AUDIENCE = "authenticated"
                mock_settings.SUPABASE_JWT_ISSUER = "https://example.com"

                mock_decode.return_value = {
                    "sub": test_user_id,
                    "email": test_email,
                    "aud": "authenticated",
                }

                result = validate_jwt("test-token")

                assert result.user_id == uuid.UUID(test_user_id)
                assert result.email == test_email

    def test_validate_jwt_with_public_key_mocked(self):
        """Test JWT validation using public key (RS256/ES256) - mocked jwt.decode."""
        test_user_id = str(uuid.uuid4())
        test_email = "user@example.com"

        with patch("app.auth.service.settings") as mock_settings:
            with patch("app.auth.service.jwt.decode") as mock_decode:
                mock_settings.SUPABASE_JWT_SECRET = None
                mock_settings.SUPABASE_JWT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----"
                mock_settings.SUPABASE_JWKS_URL = None
                mock_settings.JWT_ALGORITHM = "ES256"
                mock_settings.SUPABASE_JWT_AUDIENCE = "authenticated"
                mock_settings.SUPABASE_JWT_ISSUER = "https://example.com"

                mock_decode.return_value = {
                    "sub": test_user_id,
                    "email": test_email,
                    "aud": "authenticated",
                }

                result = validate_jwt("test-token")

                assert result.user_id == uuid.UUID(test_user_id)
                assert result.email == test_email

    def test_validate_jwt_invalid_token(self):
        """Test JWT validation fails for invalid token."""
        with patch("app.auth.service.settings") as mock_settings:
            with patch("app.auth.service.jwt.decode") as mock_decode:
                mock_settings.SUPABASE_JWT_SECRET = "test-secret"
                mock_settings.SUPABASE_JWT_PUBLIC_KEY = None
                mock_settings.SUPABASE_JWKS_URL = None
                mock_settings.JWT_ALGORITHM = "HS256"
                mock_settings.SUPABASE_JWT_AUDIENCE = "authenticated"
                mock_settings.SUPABASE_JWT_ISSUER = "https://example.com"

                mock_decode.side_effect = InvalidTokenError("Invalid token")

                with pytest.raises(JWTValidationError):
                    validate_jwt("invalid-token")


# ============================================================================
# Authentication Dependencies Tests
# ============================================================================

@pytest.mark.asyncio
class TestAuthDependencies:
    """Test FastAPI auth dependencies (get_current_user_claims, get_current_user)."""

    async def test_get_current_user_claims_valid(self):
        """Test extracting valid claims from Authorization header."""
        authorization = "Bearer test-token"

        with patch("app.auth.dependencies.validate_jwt") as mock_validate:
            mock_validate.return_value = TokenData(
                user_id=uuid.uuid4(),
                email="user@example.com"
            )

            result = await get_current_user_claims(authorization)

            assert result.email == "user@example.com"
            mock_validate.assert_called_once_with("test-token")

    async def test_get_current_user_claims_missing_header(self):
        """Test that missing Authorization header raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_claims(None)

        assert exc_info.value.status_code == 401
        assert "Missing Authorization header" in exc_info.value.detail

    async def test_get_current_user_claims_invalid_format(self):
        """Test that invalid Authorization format raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_claims("InvalidFormat token")

        assert exc_info.value.status_code == 401
        assert "Invalid Authorization header format" in exc_info.value.detail

    async def test_get_current_user_existing_user(self, test_db):
        """Test retrieving an existing user from the database."""
        # Create a test user in the DB
        test_user_id = uuid.uuid4()
        user = User(
            supabase_user_id=test_user_id,
            email="existing@example.com",
            auth_provider="supabase",
        )
        test_db.add(user)
        await test_db.commit()

        token_data = TokenData(
            user_id=test_user_id,
            email="existing@example.com"
        )

        result = await get_current_user(token_data, test_db)

        assert result.id == user.id
        assert result.email == "existing@example.com"

    async def test_get_current_user_creates_new_user(self, test_db):
        """Test creating a new user and profile on first login."""
        test_user_id = uuid.uuid4()
        token_data = TokenData(
            user_id=test_user_id,
            email="newuser@example.com"
        )

        result = await get_current_user(token_data, test_db)

        assert result.supabase_user_id == test_user_id
        assert result.email == "newuser@example.com"

        # Verify profile was created
        stmt = select(Profile).where(Profile.user_id == result.id)
        profile_result = await test_db.execute(stmt)
        profile = profile_result.scalar_one_or_none()
        assert profile is not None

    async def test_get_current_user_invalid_token(self, test_db):
        """Test that invalid JWT raises 401."""
        with patch("app.auth.dependencies.validate_jwt") as mock_validate:
            mock_validate.side_effect = JWTValidationError("Invalid signature")

            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_claims("Bearer invalid-token")

            assert exc_info.value.status_code == 401


# ============================================================================
# User Creation & Profile Tests
# ============================================================================

class TestUserCreation:
    """Test automatic User and Profile creation on first login."""

    @pytest.mark.asyncio
    async def test_user_and_profile_created_together(self, test_db):
        """Test that User and Profile are created together."""
        test_user_id = uuid.uuid4()

        user = User(
            supabase_user_id=test_user_id,
            email="testcreate@example.com",
            auth_provider="supabase",
        )
        test_db.add(user)
        await test_db.flush()

        profile = Profile(user_id=user.id)
        test_db.add(profile)
        await test_db.commit()

        # Verify both exist
        stmt = select(User).where(User.supabase_user_id == test_user_id)
        result = await test_db.execute(stmt)
        fetched_user = result.scalar_one_or_none()

        assert fetched_user is not None
        profile_stmt = select(Profile).where(Profile.user_id == fetched_user.id)
        profile_result = await test_db.execute(profile_stmt)
        fetched_profile = profile_result.scalar_one_or_none()
        assert fetched_profile is not None

    @pytest.mark.asyncio
    async def test_user_cascade_delete(self, test_db):
        """Test that deleting a User cascades to Profile."""
        test_user_id = uuid.uuid4()

        user = User(
            supabase_user_id=test_user_id,
            email="delete-test@example.com",
            auth_provider="supabase",
        )
        test_db.add(user)
        await test_db.flush()

        profile = Profile(user_id=user.id)
        test_db.add(profile)
        await test_db.commit()

        user_id = user.id

        # Delete user
        await test_db.delete(user)
        await test_db.commit()

        # Verify both are gone
        stmt = select(User).where(User.id == user_id)
        result = await test_db.execute(stmt)
        assert result.scalar_one_or_none() is None

        stmt = select(Profile).where(Profile.user_id == user_id)
        result = await test_db.execute(stmt)
        assert result.scalar_one_or_none() is None
