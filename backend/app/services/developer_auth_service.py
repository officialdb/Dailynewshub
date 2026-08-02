"""Developer authentication service for the v2 API platform."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.email_registry import email_in_use
from app.core.developer_security import (
    create_developer_access_token,
    create_developer_refresh_token,
    verify_developer_token,
)
from app.models.developer import Developer
from app.schemas.developer import DeveloperLoginRequest, DeveloperProfileUpdateRequest, DeveloperRegisterRequest, DeveloperResponse, DeveloperTokenResponse
from app.services.email_service import send_verification_email


logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12, deprecated="auto")
FAILED_LOGIN_LIMIT = 5
FAILED_LOGIN_LOCK_SECONDS = 15 * 60


# --- API PLATFORM ---
def _developer_response(developer: Developer) -> DeveloperResponse:
    """Serialize a developer ORM instance for API responses."""

    return DeveloperResponse.model_validate(developer)


# --- API PLATFORM ---
def _failed_login_key(email: str) -> str:
    """Redis key for developer login failures."""

    return f"developer:auth:failed:{email.lower()}"


# --- API PLATFORM ---
def _lock_key(email: str) -> str:
    """Redis key for developer account lockouts."""

    return f"developer:auth:lock:{email.lower()}"


# --- API PLATFORM ---
def _refresh_pointer_key(developer_id: UUID) -> str:
    """Redis key pointing at the developer's current refresh token."""

    return f"developer:refresh-current:{developer_id}"


# --- API PLATFORM ---
def _hash_password(password: str) -> str:
    """Hash a developer password using bcrypt cost factor 12."""

    return pwd_context.hash(password)


# --- API PLATFORM ---
def _verify_password(password: str, password_hash: str) -> bool:
    """Verify a developer password against its stored hash."""

    return pwd_context.verify(password, password_hash)


# --- API PLATFORM ---
def _refresh_token_hash(refresh_token: str) -> str:
    """Hash a refresh token for Redis storage."""

    import hashlib

    return hashlib.sha256(refresh_token.encode()).hexdigest()


# --- API PLATFORM ---
async def register_developer(
    request: DeveloperRegisterRequest,
    db: AsyncSession,
) -> Developer:
    """Create a new developer account and queue a verification email."""

    # --- API PLATFORM ---
    if await email_in_use(db, request.email):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    developer = Developer(
        name=request.name,
        email=request.email,
        password_hash=_hash_password(request.password),
        company_name=request.company_name,
        website=request.website,
        what_are_you_building=request.what_are_you_building,
        is_active=True,
        is_email_verified=False,
        email_verification_token=secrets.token_urlsafe(32),
        email_verification_expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(developer)
    await db.commit()
    await db.refresh(developer)

    await send_verification_email(developer.email, developer.name, developer.email_verification_token or "")
    logger.info("Developer registered: %s", developer.email)
    return developer


# --- API PLATFORM ---
async def verify_email(token: str, db: AsyncSession) -> Developer:
    """Verify a developer email address using its verification token."""

    from fastapi import HTTPException, status

    result = await db.execute(select(Developer).where(Developer.email_verification_token == token))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    if developer.email_verification_expires_at and developer.email_verification_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired")

    developer.is_email_verified = True
    developer.email_verification_token = None
    developer.email_verification_expires_at = None
    await db.commit()
    await db.refresh(developer)
    return developer


# --- API PLATFORM ---
async def login_developer(
    request: DeveloperLoginRequest,
    db: AsyncSession,
    redis_client,
) -> DeveloperTokenResponse:
    """Authenticate a developer and return a rotated developer token pair."""

    from fastapi import HTTPException, status

    settings = get_settings()
    result = await db.execute(select(Developer).where(Developer.email == request.email))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if redis_client is not None and await redis_client.get(_lock_key(request.email)):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Account locked")
    if not _verify_password(request.password, developer.password_hash):
        if redis_client is not None:
            failures = await redis_client.incr(_failed_login_key(request.email))
            if failures == 1:
                await redis_client.expire(_failed_login_key(request.email), FAILED_LOGIN_LOCK_SECONDS)
            if failures >= FAILED_LOGIN_LIMIT:
                await redis_client.set(_lock_key(request.email), "1", ex=FAILED_LOGIN_LOCK_SECONDS)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if redis_client is not None:
        await redis_client.delete(_failed_login_key(request.email))
        await redis_client.delete(_lock_key(request.email))

    if not developer.is_email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer email not verified")
    if not developer.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer account suspended")

    access_token = create_developer_access_token(str(developer.id), tier=str(developer.tier))
    refresh_token = create_developer_refresh_token(str(developer.id))

    if redis_client is not None:
        refresh_hash = _refresh_token_hash(refresh_token)
        ttl = settings.DEVELOPER_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        await redis_client.set(f"developer:refresh:{refresh_hash}", str(developer.id), ex=ttl)
        await redis_client.set(_refresh_pointer_key(developer.id), refresh_hash, ex=ttl)

    return DeveloperTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        developer=_developer_response(developer),
    )


# --- API PLATFORM ---
async def refresh_developer_token(
    refresh_token: str,
    db: AsyncSession,
    redis_client,
) -> DeveloperTokenResponse:
    """Rotate a developer refresh token and issue a fresh access token."""

    from fastapi import HTTPException, status

    try:
        payload = verify_developer_token(refresh_token, expected_type="developer_refresh")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    result = await db.execute(select(Developer).where(Developer.id == UUID(subject)))
    developer = result.scalar_one_or_none()
    if developer is None or not developer.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Developer not found or inactive")

    refresh_hash = _refresh_token_hash(refresh_token)
    if redis_client is not None:
        stored = await redis_client.get(f"developer:refresh:{refresh_hash}")
        if not stored:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")
        await redis_client.delete(f"developer:refresh:{refresh_hash}")

    access_token = create_developer_access_token(str(developer.id), tier=str(developer.tier))
    new_refresh_token = create_developer_refresh_token(str(developer.id))

    if redis_client is not None:
        new_hash = _refresh_token_hash(new_refresh_token)
        ttl = get_settings().DEVELOPER_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        await redis_client.set(f"developer:refresh:{new_hash}", str(developer.id), ex=ttl)
        await redis_client.set(_refresh_pointer_key(developer.id), new_hash, ex=ttl)

    return DeveloperTokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        developer=_developer_response(developer),
    )


# --- API PLATFORM ---
async def logout_developer(
    access_token: str,
    refresh_token: str | None,
    db: AsyncSession,
    redis_client,
) -> None:
    """Revoke the current developer access and refresh tokens."""

    try:
        payload = verify_developer_token(access_token, expected_type="developer_access")
    except JWTError:
        payload = {}

    if redis_client is not None:
        jti = payload.get("jti")
        if jti:
            exp = payload.get("exp", 0)
            ttl = max(0, int(exp - datetime.now(timezone.utc).timestamp()))
            await redis_client.set(f"developer:blacklist:{jti}", "1", ex=ttl)

        subject = payload.get("sub")
        if subject:
            developer_id = UUID(subject)
            pointer_key = _refresh_pointer_key(developer_id)
            current_hash = await redis_client.get(pointer_key)
            if current_hash:
                await redis_client.delete(f"developer:refresh:{current_hash}")
            if refresh_token:
                await redis_client.delete(f"developer:refresh:{_refresh_token_hash(refresh_token)}")
            await redis_client.delete(pointer_key)


# --- API PLATFORM ---
async def update_developer_profile(
    developer: Developer,
    payload: DeveloperProfileUpdateRequest,
    db: AsyncSession,
) -> Developer:
    """Update the developer profile and persist the changes."""

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(developer, field, value)
    await db.commit()
    await db.refresh(developer)
    return developer
