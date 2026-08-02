"""Dependency helpers for developer JWT authentication."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.developer_security import verify_developer_token
from app.core.dependencies_v2 import get_db
from app.models.developer import Developer


# --- API PLATFORM ---
bearer_scheme = HTTPBearer(auto_error=False)


# --- API PLATFORM ---
async def get_db_developer() -> AsyncGenerator[AsyncSession, None]:
    """Yield the v2 database session for developer endpoints."""

    async for session in get_db():
        yield session


# --- API PLATFORM ---
async def _is_blacklisted(request: Request, jti: str | None) -> bool:
    """Check whether a developer access token has been revoked."""

    if not jti:
        return False

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is None:
        return False

    return bool(await redis_client.get(f"developer:blacklist:{jti}"))


# --- API PLATFORM ---
async def get_current_developer(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Developer:
    """Resolve the authenticated developer from cookie or Authorization header."""

    # --- SEC FIX SEC-007 ---
    token = request.cookies.get("developer_access_token")
    if not token and credentials is not None and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization required")

    try:
        payload = verify_developer_token(token, expected_type="developer_access")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if await _is_blacklisted(request, payload.get("jti")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    try:
        developer_id = UUID(str(subject))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject") from exc

    result = await db.execute(select(Developer).where(Developer.id == developer_id))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Developer not found")
    if not developer.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer account is inactive")
    if not developer.is_email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer email is not verified")

    return developer
