"""FastAPI dependency helpers for the v2 NMS database and authentication."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import is_token_blacklisted
from app.core.security import verify_token
from app.db.session_v2 import get_db_v2
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an asynchronous session for the v2 NMS database."""

    async for session in get_db_v2():
        yield session


async def get_user_from_token(
    token: str,
    db: AsyncSession,
    request: Request | None = None,
) -> User:
    """Resolve the current user from a JWT access token against the v2 database."""

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
    """Require an authenticated user with admin privileges (v2 DB)."""

    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
