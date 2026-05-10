"""Shared test fixtures and configuration."""

import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.models.base import Base
from main import app


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create an in-memory SQLite database for testing.
    
    Note: SQLite doesn't support JSONB (PostgreSQL-specific type).
    SQLAlchemy will automatically use JSON for SQLite and JSONB for PostgreSQL.
    This is handled by the Column type mapping at runtime.
    """
    from sqlalchemy import event
    from sqlalchemy.pool import Pool
    
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    # Enable foreign keys for SQLite (not enabled by default)
    @event.listens_for(Pool, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        if "sqlite" in str(dbapi_conn):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def test_client(test_db: AsyncSession) -> TestClient:
    """Create a test client with dependency overrides."""
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ============================================================================
# Auth Fixtures (JWT, Claims, Mock Tokens)
# ============================================================================

@pytest.fixture
def valid_jwt_token() -> str:
    """Create a valid mock JWT token (unsigned, for local testing)."""
    import json
    import base64

    # Mock JWT: header.payload.signature
    header = {"alg": "ES256", "typ": "JWT", "kid": "test-kid"}
    payload = {
        "sub": str(uuid.uuid4()),  # Supabase user ID
        "email": "test@example.com",
        "aud": "authenticated",
        "iss": "https://kgvkoylodjuuzyfbcjjc.supabase.co/auth/v1",
        "iat": 1234567890,
        "exp": 9999999999,
    }
    signature = "test-signature"

    def encode(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")

    token = f"{encode(header)}.{encode(payload)}.{signature}"
    return token


@pytest.fixture
def test_user_id() -> uuid.UUID:
    """Generate a consistent test user ID."""
    return uuid.UUID("12345678-1234-5678-1234-567812345678")


@pytest.fixture
def test_email() -> str:
    """Test email for user."""
    return "testuser@example.com"


@pytest.fixture
def auth_header(valid_jwt_token: str) -> dict:
    """Authorization header with Bearer token."""
    return {"Authorization": f"Bearer {valid_jwt_token}"}


# ============================================================================
# Event Loop Fixture (for async tests)
# ============================================================================

@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()



@pytest.fixture
def test_client(test_db: AsyncSession) -> TestClient:
    """Create a test client with dependency overrides."""
    # Override the get_db dependency
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ============================================================================
# Auth Fixtures (JWT, Claims, Mock Tokens)
# ============================================================================

@pytest.fixture
def valid_jwt_token() -> str:
    """Create a valid mock JWT token (unsigned, for local testing)."""
    import json
    import base64

    # Mock JWT: header.payload.signature
    header = {"alg": "ES256", "typ": "JWT", "kid": "test-kid"}
    payload = {
        "sub": str(uuid.uuid4()),  # Supabase user ID
        "email": "test@example.com",
        "aud": "authenticated",
        "iss": "https://kgvkoylodjuuzyfbcjjc.supabase.co/auth/v1",
        "iat": 1234567890,
        "exp": 9999999999,
    }
    signature = "test-signature"

    def encode(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")

    token = f"{encode(header)}.{encode(payload)}.{signature}"
    return token


@pytest.fixture
def test_user_id() -> uuid.UUID:
    """Generate a consistent test user ID."""
    return uuid.UUID("12345678-1234-5678-1234-567812345678")


@pytest.fixture
def test_email() -> str:
    """Test email for user."""
    return "testuser@example.com"


@pytest.fixture
def auth_header(valid_jwt_token: str) -> dict:
    """Authorization header with Bearer token."""
    return {"Authorization": f"Bearer {valid_jwt_token}"}


# ============================================================================
# Event Loop Fixture (for async tests)
# ============================================================================

@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
