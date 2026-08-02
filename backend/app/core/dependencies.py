"""FastAPI dependency helpers for database and authentication."""

from __future__ import annotations

import hashlib
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.db.session import get_db as session_get_db
from app.models.revoked_token import RevokedToken
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an asynchronous database session dependency."""

    async for session in session_get_db():
        yield session


# --- DOCKER FIX ---
def get_redis(request: Request) -> Any:
    """Return the active Redis client for healthchecks and dependencies."""

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Redis is not available")
    return redis_client


# --- SEC FIX SEC-001 ---
async def is_token_blacklisted(token: str, db: AsyncSession, redis_client: Any | None) -> bool:
    """Check Redis first, then PostgreSQL so Redis loss does not reinstate tokens."""

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    if redis_client is not None:
        try:
            if await redis_client.exists(f"blacklist:{token_hash}"):
                return True
        except Exception:
            pass

    from datetime import datetime

    result = await db.execute(
        select(RevokedToken)
        .where(RevokedToken.token_hash == token_hash)
        .where(RevokedToken.expires_at > datetime.utcnow())
    )
    return result.scalar_one_or_none() is not None


# --- SEC FIX SEC-001 ---
async def revoke_token(
    token: str,
    expires_in_seconds: int,
    db: AsyncSession,
    redis_client: Any | None,
) -> None:
    """Revoke a token in Redis and PostgreSQL using a SHA-256 token hash."""

    from datetime import datetime, timedelta

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in_seconds)

    if redis_client is not None:
        try:
            await redis_client.setex(f"blacklist:{token_hash}", expires_in_seconds, "1")
        except Exception:
            pass

    existing = await db.execute(select(RevokedToken).where(RevokedToken.token_hash == token_hash))
    if existing.scalar_one_or_none() is None:
        db.add(
            RevokedToken(
                token_hash=token_hash,
                revoked_at=datetime.utcnow(),
                expires_at=expires_at,
            )
        )
        await db.commit()


async def get_user_from_token(
    token: str,
    db: AsyncSession,
    request: Request | None = None,
) -> User:
    """Resolve the current user from a JWT access token."""

    try:
        payload = verify_token(token, expected_type="access")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    # --- SEC FIX SEC-001 ---
    if request is not None:
        redis_client = getattr(request.app.state, "redis", None)
        if await is_token_blacklisted(token, db, redis_client):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    try:
        user_id = UUID(str(subject))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject") from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    """Resolve the authenticated user from the access-token cookie or Authorization header."""

    # --- SEC FIX SEC-007 ---
    token = request.cookies.get("access_token")
    if not token and credentials is not None and credentials.scheme.lower() == "bearer":
        token = credentials.credentials

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"code": "MISSING_TOKEN"})

    return await get_user_from_token(token, db=db, request=request)


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an authenticated user with admin privileges."""

    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
