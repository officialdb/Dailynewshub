"""FastAPI dependency helpers for database and authentication."""

from __future__ import annotations

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
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an asynchronous database session dependency."""

    async for session in session_get_db():
        yield session


async def _is_token_blacklisted(request: Request, jti: str | None) -> bool:
    """Check whether a token has been revoked through the Redis blacklist."""

    if not jti:
        return False

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is None:
        return False

    return bool(await redis_client.get(f"blacklist:{jti}"))


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

    if request is not None and await _is_token_blacklisted(request, payload.get("jti")):
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
    """Resolve the authenticated user from the Authorization header."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization required")

    return await get_user_from_token(credentials.credentials, db=db, request=request)


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an authenticated user with admin privileges."""

    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
