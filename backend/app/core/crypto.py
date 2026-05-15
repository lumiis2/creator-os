from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from .config import settings


def _get_fernet() -> Fernet | None:
    key = (settings.ENCRYPTION_KEY or "").strip()
    if not key:
        return None
    try:
        return Fernet(key)
    except Exception:
        return None


def encrypt_token(token: str | None) -> str | None:
    if not token:
        return None
    fernet = _get_fernet()
    if not fernet:
        return token
    return fernet.encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(token: str | None) -> str | None:
    if not token:
        return None
    fernet = _get_fernet()
    if not fernet:
        return token
    try:
        return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return None
