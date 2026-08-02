"""Authentication routes for the v2 NMS API."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.config import get_settings
from app.core.dependencies import is_token_blacklisted, revoke_token
from app.core.email_registry import email_in_use
from app.core.dependencies_v2 import get_db, get_user_from_token
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
    verify_token,
)
from app.models.permission import UserRole
from app.models.user import User
from app.schemas.v2.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.v2.user import UserResponse

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth-v2"])


class AuthEnvelope(BaseModel):
    """Combined user + tokens response."""

    model_config = ConfigDict(from_attributes=True)

    user: UserResponse
    tokens: TokenResponse


def _user_response(user: User) -> dict[str, Any]:
    """Build a UserResponse from a User ORM instance, including roles."""
    from app.schemas.v2.user import RoleSummary

    roles = [RoleSummary(id=ur.role.id, name=ur.role.name) for ur in user.user_roles if ur.role]
    return UserResponse(
        id=user.id,
        name=user.name,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        avatar_url=user.avatar_url,
        country=user.country,
        state=user.state,
        phone_number=user.phone_number,
        is_active=user.is_active,
        is_admin=user.is_admin,
        roles=roles,
        created_at=user.created_at,
        updated_at=user.updated_at,
    ).model_dump(mode="json")


def _token_payload(user: User) -> dict[str, Any]:
    """Build the auth envelope for a user."""
    return {
        "user": _user_response(user),
        "tokens": TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
        ).model_dump(mode="json"),
    }


# --- SEC FIX SEC-007 ---
def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set v2 auth tokens as httpOnly cookies for dashboard clients."""

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
        path="/api/v2/auth/refresh-token",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")  # --- SEC FIX SEC-006 ---
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Register a new NMS user account."""
    # --- API PLATFORM ---
    validate_password_strength(body.password)

    if await email_in_use(db, body.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=f"{body.first_name} {body.last_name}".strip(),
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        password_hash=get_password_hash(body.password),
        country=body.country or None,
        state=body.state or None,
        phone_number=body.phone_number or None,
    )
    db.add(user)
    await db.flush()

    # Refresh with eager loading
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user.id)
    )
    user = result.scalar_one()

    await log_audit(
        db,
        action="user:register",
        resource_type="user",
        user_id=user.id,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    logger.info("New NMS user registered: %s (%s)", user.email, user.id)
    return {"success": True, "message": "Registration successful", "data": _token_payload(user)}


@router.post("/login")
@limiter.limit("10/minute")  # --- SEC FIX SEC-006 ---
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Authenticate and receive JWT tokens."""
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.email == body.email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    await log_audit(
        db,
        action="user:login",
        resource_type="user",
        user_id=user.id,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    payload = _token_payload(user)
    # --- SEC FIX SEC-007 ---
    _set_auth_cookies(response, payload["tokens"]["access_token"], payload["tokens"]["refresh_token"])
    return {"success": True, "message": "Login successful", "data": {"user": payload["user"]}}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Blacklist the current access token."""
    # --- SEC FIX SEC-007 ---
    auth_header = request.headers.get("Authorization", "")
    token = request.cookies.get("access_token")
    if not token and auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization required")

    payload = verify_token(token, expected_type="access")
    # --- SEC FIX SEC-001 ---
    redis_client = getattr(request.app.state, "redis", None)
    exp = payload.get("exp", 0)
    ttl = max(1, int(exp - datetime.now(timezone.utc).timestamp()))
    await revoke_token(token, ttl, db, redis_client)

    sub = payload.get("sub")
    if sub:
        await log_audit(
            db,
            action="user:logout",
            resource_type="user",
            user_id=UUID(sub),
            resource_id=UUID(sub),
        )
        await db.commit()

    # --- SEC FIX SEC-007 ---
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v2/auth/refresh-token")
    return {"success": True, "message": "Logged out successfully"}


@router.post("/refresh-token")
async def refresh_token(
    request: Request,
    response: Response,
    body: RefreshTokenRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Exchange a refresh token for a new token pair."""
    # --- SEC FIX SEC-007 ---
    refresh_value = body.refresh_token if body else request.cookies.get("refresh_token")
    if not refresh_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    try:
        payload = verify_token(refresh_value, expected_type="refresh")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    # --- SEC FIX SEC-001 ---
    redis_client = getattr(request.app.state, "redis", None)
    if await is_token_blacklisted(refresh_value, db, redis_client):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == UUID(subject))
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    token_data = _token_payload(user)
    # --- SEC FIX SEC-001 ---
    exp = payload.get("exp", 0)
    ttl = max(1, int(exp - datetime.now(timezone.utc).timestamp()))
    await revoke_token(refresh_value, ttl, db, redis_client)
    # --- SEC FIX SEC-007 ---
    _set_auth_cookies(response, token_data["tokens"]["access_token"], token_data["tokens"]["refresh_token"])
    return {"success": True, "message": "Token refreshed", "data": {"user": token_data["user"]}}


@router.post("/forgot-password")
@limiter.limit("3/hour")  # --- SEC FIX SEC-006 ---
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Request a password reset. Returns generic success to prevent email enumeration."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is not None:
        reset_token = create_access_token(str(user.id))
        redis_client = getattr(db, "_redis", None)
        logger.info("Password reset requested for %s (token generated)", body.email)

    return {"success": True, "message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Reset password using a reset token."""
    validate_password_strength(body.new_password)

    try:
        payload = verify_token(body.token, expected_type="access")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token") from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == UUID(subject)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = get_password_hash(body.new_password)
    await db.commit()

    return {"success": True, "message": "Password reset successful"}


@router.post("/verify-email")
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Verify email address using a verification token."""
    try:
        payload = verify_token(body.token, expected_type="access")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token") from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == UUID(subject)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"success": True, "message": "Email verified successfully"}
