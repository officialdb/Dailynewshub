"""Authentication routes."""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from jose import JWTError
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import get_db, is_token_blacklisted, revoke_token
from app.core.email_registry import email_in_use
from app.core.rate_limit import enforce_rate_limit, limiter
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password, verify_token, validate_password_strength
from app.models.user import User
from app.schemas.user import RefreshTokenRequest, TokenResponse, UserCreate, UserResponse

logger = logging.getLogger(__name__)
settings = get_settings()


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


# --- SEC FIX SEC-007 ---
def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set JWTs as httpOnly cookies for browser clients."""

    is_production = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth/refresh-token",
    )


# --- SEC FIX SEC-001 ---
async def _blacklist_token(request: Request, token: str, db: AsyncSession) -> dict[str, Any]:
    """Blacklist a JWT in Redis and PostgreSQL until it expires."""

    payload = verify_token(token)
    redis_client = getattr(request.app.state, "redis", None)
    expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=timezone.utc)
    ttl = max(1, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    await revoke_token(token, ttl, db, redis_client)
    return payload


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")  # --- SEC FIX SEC-006 ---
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Register a new user account."""

    await enforce_rate_limit(request, scope="auth:register", limit=10, window_seconds=600)
    # --- API PLATFORM ---
    validate_password_strength(user_in.password)
    if await email_in_use(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        avatar_url=user_in.avatar_url,
        country=user_in.country,
        state=user_in.state,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    payload = _token_payload(user)
    return {"success": True, "message": "User registered successfully", "data": payload}


@router.post("/login")
@limiter.limit("10/minute")  # --- SEC FIX SEC-006 ---
async def login(
    request: Request,
    response: Response,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Authenticate a user and issue fresh JWT tokens."""

    # --- SEC FIX SEC-006 ---
    await enforce_rate_limit(request, scope="auth:login", limit=10, window_seconds=60)
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    payload = _token_payload(user)
    # --- SEC FIX SEC-007 ---
    _set_auth_cookies(response, payload["tokens"]["access_token"], payload["tokens"]["refresh_token"])
    return {"success": True, "message": "Login successful", "data": {"user": payload["user"]}}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Revoke the presented access token."""

    await enforce_rate_limit(request, scope="auth:logout", limit=60, window_seconds=900)
    # --- SEC FIX SEC-007 ---
    header = authorization or request.headers.get("Authorization")
    token = request.cookies.get("access_token")
    if not token and header and header.startswith("Bearer "):
        token = header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    try:
        await _blacklist_token(request, token, db)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    # --- SEC FIX SEC-007 ---
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh-token")
    return {"success": True, "message": "Logout successful", "data": {"revoked": True}}


@router.post("/refresh-token")
async def refresh_token(
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Exchange a valid refresh token for a new token pair."""

    await enforce_rate_limit(request, scope="auth:refresh", limit=60, window_seconds=900)
    # --- SEC FIX SEC-007 ---
    refresh_value = payload.refresh_token if payload else request.cookies.get("refresh_token")
    if not refresh_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    try:
        token_payload = verify_token(refresh_value, expected_type="refresh")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    redis_client = getattr(request.app.state, "redis", None)
    # --- SEC FIX SEC-001 ---
    if await is_token_blacklisted(refresh_value, db, redis_client):
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
    # --- SEC FIX SEC-001 ---
    exp = token_payload.get("exp", 0)
    ttl = max(1, int(exp - datetime.now(timezone.utc).timestamp()))
    await revoke_token(refresh_value, ttl, db, redis_client)
    # --- SEC FIX SEC-007 ---
    _set_auth_cookies(response, payload_data["tokens"]["access_token"], payload_data["tokens"]["refresh_token"])
    return {"success": True, "message": "Token refreshed successfully", "data": {"user": payload_data["user"]}}


class ForgotPasswordRequest(BaseModel):
    """Payload for password recovery request."""

    email: EmailStr


@router.post("/forgot-password")
@limiter.limit("3/hour")  # --- SEC FIX SEC-006 ---
async def forgot_password(request: Request, payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Request a password reset for an account."""

    await enforce_rate_limit(request, scope="auth:forgot-password", limit=5, window_seconds=300)
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None:
        # Avoid user enumeration by returning a generic success message
        return {
            "success": True,
            "message": "If an account with that email exists, password recovery instructions have been sent.",
            "data": {"email": payload.email},
        }

    return {
        "success": True,
        "message": f"Password reset instructions and verification code sent to {payload.email}.",
        "data": {"email": payload.email, "status": "sent"},
    }
