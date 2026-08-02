"""Developer authentication routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies_v2 import get_db
from app.core.rate_limit import enforce_rate_limit, limiter
from app.schemas.developer import DeveloperLoginRequest, DeveloperRefreshTokenRequest, DeveloperRegisterRequest, DeveloperResponse
from app.services.developer_auth_service import (
    login_developer,
    logout_developer,
    refresh_developer_token,
    register_developer,
    verify_email,
)


# --- API PLATFORM ---
router = APIRouter(prefix="/auth")
settings = get_settings()


# --- SEC FIX SEC-007 ---
def _set_developer_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set developer JWTs as httpOnly cookies for browser clients."""

    is_production = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="developer_access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.DEVELOPER_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="developer_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.DEVELOPER_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v2/developer/auth/refresh",
    )


# --- API PLATFORM ---
@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")  # --- SEC FIX SEC-006 ---
async def register(
    body: DeveloperRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Register a new developer account."""

    await enforce_rate_limit(request, scope="developer-register", limit=5, window_seconds=3600)
    developer = await register_developer(body, db)
    return {"success": True, "message": "Developer registered", "data": DeveloperResponse.model_validate(developer).model_dump(mode="json")}


# --- API PLATFORM ---
@router.get("/verify-email")
async def verify_email_route(
    token: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify a developer email address and return the account record."""

    developer = await verify_email(token, db)
    return {
        "success": True,
        "message": "Email verified",
        "data": DeveloperResponse.model_validate(developer).model_dump(mode="json"),
        "redirect_url": "/developer",
    }


# --- API PLATFORM ---
@router.post("/login")
@limiter.limit("10/minute")  # --- SEC FIX SEC-006 ---
async def login(
    body: DeveloperLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Authenticate a developer and return token pair."""

    await enforce_rate_limit(request, scope="developer-login", limit=10, window_seconds=60)
    redis_client = getattr(request.app.state, "redis", None)
    tokens = await login_developer(body, db, redis_client)
    token_data = tokens.model_dump(mode="json")
    # --- SEC FIX SEC-007 ---
    _set_developer_auth_cookies(response, token_data["access_token"], token_data["refresh_token"])
    return {"success": True, "message": "Login successful", "data": {"developer": token_data["developer"]}}


# --- API PLATFORM ---
@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    body: DeveloperRefreshTokenRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Rotate a developer refresh token."""

    redis_client = getattr(request.app.state, "redis", None) if request else None
    # --- SEC FIX SEC-007 ---
    refresh_token = body.refresh_token if body else request.cookies.get("developer_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    tokens = await refresh_developer_token(refresh_token, db, redis_client)
    token_data = tokens.model_dump(mode="json")
    _set_developer_auth_cookies(response, token_data["access_token"], token_data["refresh_token"])
    return {"success": True, "message": "Token refreshed", "data": {"developer": token_data["developer"]}}


# --- API PLATFORM ---
@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, Any]:
    """Blacklist the current developer access token and revoke refresh access."""

    # --- SEC FIX SEC-007 ---
    access_token = request.cookies.get("developer_access_token")
    if not access_token and authorization and authorization.startswith("Bearer "):
        access_token = authorization[7:]
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization required")
    redis_client = getattr(request.app.state, "redis", None)
    await logout_developer(access_token, request.cookies.get("developer_refresh_token"), db, redis_client)
    response.delete_cookie("developer_access_token", path="/")
    response.delete_cookie("developer_refresh_token", path="/api/v2/developer/auth/refresh")
    return {"success": True, "message": "Logged out successfully"}
