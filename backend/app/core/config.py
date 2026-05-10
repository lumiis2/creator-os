from pydantic_settings import BaseSettings
from typing import Optional
from enum import Enum


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
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # JWT & Supabase
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_ALGORITHM: str = "HS256"
    
    # Supabase Auth
    SUPABASE_JWT_SECRET: Optional[str] = None
    SUPABASE_JWT_PUBLIC_KEY: Optional[str] = None
    SUPABASE_JWKS_URL: Optional[str] = None
    SUPABASE_JWT_AUDIENCE: Optional[str] = "authenticated"
    SUPABASE_JWT_ISSUER: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure any postgres-style URL is normalized to the asyncpg dialect for SQLAlchemy
settings.DATABASE_URL = _normalize_db_url(settings.DATABASE_URL)
