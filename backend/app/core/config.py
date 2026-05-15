from enum import Enum

import json
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Environment(str, Enum):
    LOCAL = "local"
    DEVELOPMENT = "development"
    PRODUCTION = "production"


def _normalize_db_url(url: str) -> str:
    """Normalize common postgres URLs to SQLAlchemy async driver.

    - "postgres://..." -> "postgresql+asyncpg://..."
    - "postgresql://..." -> "postgresql+asyncpg://..."
    - Converts sslmode parameter to asyncpg ssl parameter
    Leaves already-correct URLs unchanged.
    """
    if not url:
        return url

    # Step 1: Convert driver
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Step 2: Convert sslmode to asyncpg ssl parameter
    # asyncpg uses ssl=require, not ?sslmode=require
    if "?sslmode=require" in url:
        url = url.replace("?sslmode=require", "")
        # Add ssl parameter for asyncpg
        url += "?ssl=require"
    elif "&sslmode=require" in url:
        url = url.replace("&sslmode=require", "")
        url += "&ssl=require"

    return url


_current_dir = Path(__file__).resolve().parent
_repo_root = _current_dir.parents[2]


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: Environment = Environment.LOCAL

    # Database - default to a local docker-friendly URL
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/creatoros"
    REDIS_URL: str = "redis://localhost:6379/0"

    # API
    API_TITLE: str = "CreatorOS API"
    API_VERSION: str = "v1"
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    # JWT & Supabase
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_ALGORITHM: str = "HS256"

    # Supabase Auth
    SUPABASE_JWT_SECRET: str | None = None
    SUPABASE_JWT_PUBLIC_KEY: str | None = None
    SUPABASE_JWKS_URL: str | None = None
    SUPABASE_JWT_AUDIENCE: str | None = "authenticated"
    SUPABASE_JWT_ISSUER: str | None = None
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # OAuth (YouTube/Google)
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None

    # OAuth (Meta)
    META_APP_ID: str | None = None
    META_APP_SECRET: str | None = None
    META_REDIRECT_URI: str | None = None

    # Token encryption
    ENCRYPTION_KEY: str | None = None

    # AI
    AI_PROVIDER: str | None = None
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str | None = None

    # Web Search
    WEB_SEARCH_API_KEY: str | None = None
    WEB_SEARCH_ENABLED: bool = False

    class Config:
        env_file = (
            _current_dir / ".env",
            _repo_root / ".env",
        )
        case_sensitive = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()

# Ensure any postgres-style URL is normalized to the asyncpg dialect for SQLAlchemy
settings.DATABASE_URL = _normalize_db_url(settings.DATABASE_URL)
