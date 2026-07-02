"""Password hashing and JWT token helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash a plaintext password."""

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored hash."""

    return pwd_context.verify(plain_password, hashed_password)


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    """Create a signed JWT with the requested lifetime."""

    settings = get_settings()
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str) -> str:
    """Create an access token for the supplied subject."""

    settings = get_settings()
    return _create_token(subject, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(subject: str) -> str:
    """Create a refresh token for the supplied subject."""

    settings = get_settings()
    return _create_token(subject, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def verify_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    """Decode and validate a JWT payload."""

    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:  # pragma: no cover - defensive guard
        raise JWTError("Invalid token") from exc

    if expected_type and payload.get("type") != expected_type:
        raise JWTError("Unexpected token type")

    return payload

