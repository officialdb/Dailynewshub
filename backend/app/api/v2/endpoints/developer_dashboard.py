"""Developer dashboard endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies_v2 import get_db
from app.core.developer_dependencies import get_current_developer
from app.models.developer import Developer
from app.schemas.developer import DeveloperProfileUpdateRequest, DeveloperResponse
from app.schemas.usage import TopEndpointResponse, UsageHistoryResponse, UsageStatsResponse
from app.services.developer_auth_service import update_developer_profile
from app.services.usage_service import get_top_endpoints, get_usage_history, get_usage_stats


# --- API PLATFORM ---
router = APIRouter()


# --- API PLATFORM ---
@router.get("/me")
async def get_me(current_developer: Developer = Depends(get_current_developer)) -> dict[str, Any]:
    """Return the authenticated developer profile."""

    return {"success": True, "message": "Developer profile", "data": DeveloperResponse.model_validate(current_developer).model_dump(mode="json")}


# --- API PLATFORM ---
@router.put("/me")
async def update_me(
    body: DeveloperProfileUpdateRequest,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update the authenticated developer profile."""

    developer = await update_developer_profile(current_developer, body, db)
    return {"success": True, "message": "Developer profile updated", "data": DeveloperResponse.model_validate(developer).model_dump(mode="json")}


# --- API PLATFORM ---
@router.get("/me/usage")
async def me_usage(
    request: Request,
    api_key_id: str | None = Query(default=None),
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return usage stats for the authenticated developer."""

    redis_client = getattr(request.app.state, "redis", None)
    stats = await get_usage_stats(str(current_developer.id), api_key_id, db, redis_client)
    return {"success": True, "message": "Usage stats", "data": stats.model_dump(mode="json")}


# --- API PLATFORM ---
@router.get("/me/usage/history")
async def me_usage_history(
    period_days: int = Query(default=30, ge=1, le=90),
    api_key_id: str | None = Query(default=None),
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return usage history for the authenticated developer."""

    history = await get_usage_history(str(current_developer.id), api_key_id, period_days, db)
    return {"success": True, "message": "Usage history", "data": history.model_dump(mode="json")}


# --- API PLATFORM ---
@router.get("/me/usage/endpoints")
async def me_usage_endpoints(
    period_days: int = Query(default=30, ge=1, le=90),
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return the top endpoints for the authenticated developer."""

    endpoints: list[TopEndpointResponse] = await get_top_endpoints(str(current_developer.id), period_days, db)
    return {"success": True, "message": "Top endpoints", "data": [item.model_dump(mode="json") for item in endpoints]}
