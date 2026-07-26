"""Authentication routes."""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from jose import JWTError
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.rate_limit import enforce_rate_limit
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password, verify_token, validate_password_strength
from app.models.user import User
from app.schemas.user import RefreshTokenRequest, TokenResponse, UserCreate, UserResponse

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    """Login payload using email and password."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


class AuthEnvelope(BaseModel):
    """Serialized auth response wrapper."""

    model_config = ConfigDict(from_attributes=True)

    user: UserResponse
    tokens: TokenResponse


def _token_payload(user: User) -> dict[str, Any]:
    """Build a serialized auth payload for a user."""

    return {
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
        "tokens": TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
        ).model_dump(mode="json"),
    }


async def _blacklist_token(request: Request, token: str) -> dict[str, Any]:
    """Blacklist a JWT in Redis until it expires."""

    payload = verify_token(token)
    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Redis is not available")

    expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=timezone.utc)
    ttl = max(1, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    await redis_client.setex(f"blacklist:{payload['jti']}", ttl, "1")
    return payload


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Register a new user account."""

    await enforce_rate_limit(request, scope="auth:register", limit=10, window_seconds=600)
    validate_password_strength(user_in.password)
    existing_user = await db.scalar(select(User).where(User.email == user_in.email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        avatar_url=user_in.avatar_url,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    payload = _token_payload(user)
    return {"success": True, "message": "User registered successfully", "data": payload}


@router.post("/login")
async def login(request: Request, credentials: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Authenticate a user and issue fresh JWT tokens."""

    await enforce_rate_limit(request, scope="auth:login", limit=20, window_seconds=300)
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    payload = _token_payload(user)
    return {"success": True, "message": "Login successful", "data": payload}


@router.post("/logout")
async def logout(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Revoke the presented access token."""

    await enforce_rate_limit(request, scope="auth:logout", limit=60, window_seconds=900)
    header = authorization or request.headers.get("Authorization")
    if not header or not header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    token = header.split(" ", 1)[1].strip()
    try:
        await _blacklist_token(request, token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    return {"success": True, "message": "Logout successful", "data": {"revoked": True}}


@router.post("/refresh-token")
async def refresh_token(request: Request, payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Exchange a valid refresh token for a new token pair."""

    await enforce_rate_limit(request, scope="auth:refresh", limit=60, window_seconds=900)
    try:
        token_payload = verify_token(payload.refresh_token, expected_type="refresh")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is not None and await redis_client.get(f"blacklist:{token_payload.get('jti')}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    subject = token_payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token subject")

    try:
        user_id = UUID(str(subject))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token subject") from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    payload_data = _token_payload(user)
    return {"success": True, "message": "Token refreshed successfully", "data": payload_data}


# --- FIX 1: Forgot Password ---


class ForgotPasswordRequest(BaseModel):
    """Payload for requesting a password reset."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload for resetting a password with a token."""

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=255)


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Generate a password reset token and log it for testing."""

    await enforce_rate_limit(request, scope="auth:forgot", limit=5, window_seconds=600)

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    success_msg = "If this email exists, a reset link has been sent."

    if not user:
        return {"success": True, "message": success_msg}

    token = secrets.token_urlsafe(32)

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is not None:
        await redis_client.setex(f"reset_token:{token}", 1800, str(user.id))

    logger.info("Password reset token for %s: %s", payload.email, token)

    return {
        "success": True,
        "message": success_msg,
        "debug_token": token,
    }


@router.post("/reset-password")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify reset token and update user password."""

    await enforce_rate_limit(request, scope="auth:reset", limit=10, window_seconds=600)

    validate_password_strength(payload.new_password)

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Redis is not available",
        )

    user_id_str = await redis_client.get(f"reset_token:{payload.token}")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    try:
        user_id = UUID(str(user_id_str))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = get_password_hash(payload.new_password)
    await db.commit()

    await redis_client.delete(f"reset_token:{payload.token}")

    return {"success": True, "message": "Password reset successfully"}
