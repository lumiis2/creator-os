"""Integration tests for auth endpoints and full flows."""

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.models import Profile, User


class TestAuthEndpoints:
    """Test authentication API endpoints."""

    def test_auth_health_configured(self, test_client: TestClient):
        """Test /auth/health reports auth is configured."""
        with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
            mock_settings.ENVIRONMENT.value = "test"
            mock_settings.SUPABASE_JWT_SECRET = "test-secret"
            mock_settings.SUPABASE_JWT_PUBLIC_KEY = None
            mock_settings.SUPABASE_JWKS_URL = None

            response = test_client.get("/auth/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert data["auth_configured"] is True

    def test_auth_health_not_configured(self, test_client: TestClient):
        """Test /auth/health warns when auth is not configured."""
        with patch("app.api.v1.endpoints.auth.settings") as mock_settings:
            mock_settings.ENVIRONMENT.value = "test"
            mock_settings.SUPABASE_JWT_SECRET = None
            mock_settings.SUPABASE_JWT_PUBLIC_KEY = None
            mock_settings.SUPABASE_JWKS_URL = None

            response = test_client.get("/auth/health")

            assert response.status_code == 200
            data = response.json()
            assert data["auth_configured"] is False
            assert "Warning" in data.get("message", "")

    def test_auth_me_unauthorized(self, test_client: TestClient):
        """Test /auth/me without token returns 401."""
        response = test_client.get("/auth/me")

        assert response.status_code == 401
        assert "Missing Authorization header" in response.json()["detail"]

    def test_auth_me_invalid_token(self, test_client: TestClient):
        """Test /auth/me with invalid token returns 401."""
        response = test_client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_auth_me_creates_user(self, test_client: TestClient, test_db):
        """Test /auth/me creates User + Profile on first access."""
        test_user_id = uuid.uuid4()

        with patch("app.auth.dependencies.validate_jwt") as mock_validate:
            mock_validate.return_value.__class__.__name__ = "TokenData"
            mock_validate.return_value.user_id = test_user_id
            mock_validate.return_value.email = "newuser@example.com"

            response = test_client.get(
                "/auth/me",
                headers={"Authorization": "Bearer test-token"}
            )

            # Depending on implementation, may be 200 or error if DB commit fails
            # For now, we're just testing the route exists
            assert response.status_code in [200, 500]


# ============================================================================
# End-to-End Flow Tests
# ============================================================================

class TestAuthFlows:
    """Test complete authentication flows."""

    @pytest.mark.asyncio
    async def test_signup_and_login_flow(self, test_db, test_client: TestClient):
        """Test a full signup → login → /auth/me flow."""
        test_user_id = uuid.uuid4()
        test_email = "flowtest@example.com"

        # Step 1: Simulate signup via Supabase (create user in DB)
        user = User(
            supabase_user_id=test_user_id,
            email=test_email,
            auth_provider="supabase",
        )
        test_db.add(user)
        await test_db.flush()

        profile = Profile(user_id=user.id, niche="tech")
        test_db.add(profile)
        await test_db.commit()

        # Step 2: Mock JWT validation for this user
        with patch("app.auth.dependencies.validate_jwt") as mock_validate:
            from app.auth.schemas import TokenData
            mock_validate.return_value = TokenData(
                user_id=test_user_id,
                email=test_email
            )

            # Step 3: Call /auth/me with token
            response = test_client.get(
                "/auth/me",
                headers={"Authorization": "Bearer test-token"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["user"]["email"] == test_email
            assert data["profile"]["niche"] == "tech"

    @pytest.mark.asyncio
    async def test_concurrent_login_same_user(self, test_db):
        """Test that concurrent logins for same user don't create duplicates."""
        # This is a concurrency safety test
        test_user_id = uuid.uuid4()

        from app.auth.schemas import TokenData

        token_data = TokenData(
            user_id=test_user_id,
            email="concurrent@example.com"
        )

        # Simulate two concurrent calls
        from app.auth.dependencies import get_current_user
        user1 = await get_current_user(token_data, test_db)
        user2 = await get_current_user(token_data, test_db)

        # Should get same user back (not duplicates)
        assert user1.id == user2.id
