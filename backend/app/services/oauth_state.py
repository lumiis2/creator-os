from __future__ import annotations

import base64
import hmac
import json
from hashlib import sha256
from typing import Any

from app.core.config import settings


def _sign(payload: bytes) -> str:
    secret = (settings.SECRET_KEY or "").encode("utf-8")
    return hmac.new(secret, payload, sha256).hexdigest()


def encode_state(data: dict[str, Any]) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    signature = _sign(raw)
    packed = base64.urlsafe_b64encode(raw).decode("utf-8")
    return f"{packed}.{signature}"


def decode_state(state: str) -> dict[str, Any]:
    packed, signature = state.split(".", 1)
    raw = base64.urlsafe_b64decode(packed.encode("utf-8"))
    expected = _sign(raw)
    if not hmac.compare_digest(expected, signature):
        raise ValueError("Invalid OAuth state signature")
    return json.loads(raw.decode("utf-8"))
