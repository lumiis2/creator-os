"""
Supabase JWT authentication service for CreatorOS.

Handles:
- JWT token validation
- User claims extraction
- Token verification with RS256 or HS256
"""

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from jwt import InvalidTokenError

from app.core.config import settings


@dataclass(frozen=True, slots=True)
class TokenClaims:
    """Parsed and validated JWT token claims."""
    
    user_id: UUID
    email: str | None
    raw: dict[str, Any]


class JWTValidationError(ValueError):
    """Raised when JWT validation fails."""
    pass


def _resolve_verification_key() -> tuple[str, list[str]]:
    """
    Resolve the JWT verification key based on environment configuration.
    
    Returns:
        Tuple of (verification_key, algorithms)
        
    Raises:
        JWTValidationError: If no valid key is configured
    """
    jwks_url = (settings.SUPABASE_JWKS_URL or "").strip()
    public_key = (settings.SUPABASE_JWT_PUBLIC_KEY or "").strip()
    secret = (settings.SUPABASE_JWT_SECRET or "").strip()

    if jwks_url:
        # With JWKS we fetch signing keys dynamically based on token kid.
        # Algorithms can vary by key type (ES256 for ECC, RS256 for RSA).
        return jwks_url, ["ES256", "RS256"]

    if public_key:
        # Allow env-style escaped newlines and validate basic PEM shape.
        public_key = public_key.replace("\\n", "\n").strip()
        if "BEGIN" not in public_key or "PUBLIC KEY" not in public_key:
            raise JWTValidationError(
                "SUPABASE_JWT_PUBLIC_KEY is not a valid PEM key. "
                "Use the full public key content, not the key ID."
            )
        # Supabase can sign JWTs with asymmetric algorithms depending on key type.
        # - RSA keys => RS256
        # - ECC (P-256) keys => ES256
        # Keep both to support key rotations/migrations without backend changes.
        return public_key, ["ES256", "RS256"]
    if secret:
        return secret, ["HS256"]

    raise JWTValidationError(
        "Supabase JWT configuration is missing. "
        "Set SUPABASE_JWKS_URL, SUPABASE_JWT_PUBLIC_KEY, or SUPABASE_JWT_SECRET."
    )


def validate_jwt(token: str) -> TokenClaims:
    """
    Validate a Supabase JWT token and extract claims.
    
    Args:
        token: Bearer token (JWT)
        
    Returns:
        TokenClaims with extracted user_id and email
        
    Raises:
        JWTValidationError: If token is invalid or verification fails
    """
    verification_key, algorithms = _resolve_verification_key()

    # Modern Supabase projects expose JWKS and rotate asymmetric keys.
    # In this mode we fetch the correct key using token kid.
    if (settings.SUPABASE_JWKS_URL or "").strip():
        try:
            jwk_client = jwt.PyJWKClient(verification_key)
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            header = jwt.get_unverified_header(token)
            token_alg = header.get("alg")
            if token_alg not in algorithms:
                raise JWTValidationError(
                    f"Invalid JWT alg '{token_alg}'. Allowed: {', '.join(algorithms)}"
                )
            decode_kwargs: dict[str, Any] = {
                "key": signing_key.key,
                "algorithms": [token_alg],
                "options": {"require": ["exp", "sub"]},
            }

            if settings.SUPABASE_JWT_AUDIENCE:
                decode_kwargs["audience"] = settings.SUPABASE_JWT_AUDIENCE
            if settings.SUPABASE_JWT_ISSUER:
                decode_kwargs["issuer"] = settings.SUPABASE_JWT_ISSUER

            payload = jwt.decode(token, **decode_kwargs)
        except (InvalidTokenError, ValueError, TypeError) as exc:
            raise JWTValidationError(f"Invalid JWT token: {str(exc)}") from exc
    else:
        decode_kwargs: dict[str, Any] = {
            "key": verification_key,
            "algorithms": algorithms,
            "options": {"require": ["exp", "sub"]},
        }
    
        # Optional claim validation
        if settings.SUPABASE_JWT_AUDIENCE:
            decode_kwargs["audience"] = settings.SUPABASE_JWT_AUDIENCE
        if settings.SUPABASE_JWT_ISSUER:
            decode_kwargs["issuer"] = settings.SUPABASE_JWT_ISSUER

        try:
            payload = jwt.decode(token, **decode_kwargs)
        except (InvalidTokenError, ValueError, TypeError) as exc:
            raise JWTValidationError(f"Invalid JWT token: {str(exc)}") from exc

    # Extract user_id from 'sub' claim
    raw_sub = payload.get("sub")
    if not raw_sub:
        raise JWTValidationError("Token missing 'sub' claim.")

    try:
        user_id = UUID(str(raw_sub))
    except (TypeError, ValueError) as exc:
        raise JWTValidationError("Token 'sub' claim is not a valid UUID.") from exc

    # Extract email from standard claims
    email = payload.get("email")

    return TokenClaims(user_id=user_id, email=email, raw=payload)
