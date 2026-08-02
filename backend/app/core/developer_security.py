"""Developer-specific JWT helpers for the v2 API platform."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt

from app.core.config import get_settings


# --- API PLATFORM ---
def _create_developer_token(subject: str, token_type: str, expires_delta: timedelta, tier: str | None = None) -> str:
    """Create a signed developer JWT with the separate developer secret."""

    settings = get_settings()
    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),
    }
    if tier is not None:
        payload["tier"] = tier
    return jwt.encode(payload, settings.DEVELOPER_SECRET_KEY, algorithm=settings.ALGORITHM)


# --- API PLATFORM ---
def create_developer_access_token(subject: str, tier: str) -> str:
    """Create a developer access token."""

    settings = get_settings()
    return _create_developer_token(
        subject=subject,
        token_type="developer_access",
        expires_delta=timedelta(minutes=settings.DEVELOPER_ACCESS_TOKEN_EXPIRE_MINUTES),
        tier=tier,
    )


# --- API PLATFORM ---
def create_developer_refresh_token(subject: str) -> str:
    """Create a developer refresh token."""

    settings = get_settings()
    return _create_developer_token(
        subject=subject,
        token_type="developer_refresh",
        expires_delta=timedelta(days=settings.DEVELOPER_REFRESH_TOKEN_EXPIRE_DAYS),
    )


# --- API PLATFORM ---
def verify_developer_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    """Decode and validate a developer JWT payload."""

    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.DEVELOPER_SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:  # pragma: no cover - defensive guard
        raise JWTError("Invalid developer token") from exc

    if expected_type and payload.get("type") != expected_type:
        raise JWTError("Unexpected developer token type")

    return payload
