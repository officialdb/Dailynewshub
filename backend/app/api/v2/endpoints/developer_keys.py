"""Developer API key management routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_db
from app.core.developer_dependencies import get_current_developer
from app.models.developer import Developer
from app.models.developer_app import DeveloperApp
from app.models.developer_api_key import DeveloperApiKey
from app.models.enums import DeveloperTier
from app.schemas.api_key import APIKeyCreatedResponse, APIKeyResponse, CreateAPIKeyRequest, RevokeAPIKeyResponse
from app.services.developer_api_key_service import generate_api_key
from app.services.usage_service import get_usage_history


# --- API PLATFORM ---
router = APIRouter(prefix="/keys")


MAX_KEYS_BY_TIER: dict[str, int | None] = {
    DeveloperTier.FREE.value: 2,
    DeveloperTier.STARTER.value: 5,
    DeveloperTier.PRO.value: 20,
    DeveloperTier.ENTERPRISE.value: None,
}


# --- API PLATFORM ---
@router.get("")
async def list_keys(
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all keys belonging to the developer."""

    result = await db.execute(
        select(DeveloperApiKey)
        .where(DeveloperApiKey.developer_id == current_developer.id)
        .order_by(DeveloperApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return {"success": True, "message": "Keys retrieved", "data": [APIKeyResponse.model_validate(key).model_dump(mode="json") for key in keys]}


# --- API PLATFORM ---
@router.post("/apps/{app_id}/keys", status_code=status.HTTP_201_CREATED)
async def create_key(
    app_id: UUID,
    body: CreateAPIKeyRequest,
    request: Request,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new developer API key for an app."""

    app = await db.scalar(
        select(DeveloperApp).where(DeveloperApp.id == app_id, DeveloperApp.developer_id == current_developer.id)
    )
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    tier = current_developer.tier.value if hasattr(current_developer.tier, "value") else str(current_developer.tier)
    max_keys = MAX_KEYS_BY_TIER.get(tier, 2)
    if max_keys is not None:
        active_count = await db.scalar(
            select(func.count(DeveloperApiKey.id)).where(
                DeveloperApiKey.developer_id == current_developer.id,
                DeveloperApiKey.is_active.is_(True),
            )
        )
        if int(active_count or 0) >= max_keys:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="API key limit reached for your tier")

    raw_key, key_hash, key_prefix = generate_api_key(body.environment)
    api_key = DeveloperApiKey(
        developer_id=current_developer.id,
        app_id=app.id,
        name=body.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        environment=body.environment,
        tier=current_developer.tier,
        expires_at=body.expires_at,
    )
    db.add(api_key)
    await db.flush()
    await log_audit(
        db,
        action="developer_api_key:create",
        resource_type="developer_api_key",
        user_id=current_developer.id,
        resource_id=api_key.id,
        changes={"name": body.name, "app_id": str(app_id)},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(api_key)
    return {
        "success": True,
        "message": "API key created",
        "data": APIKeyCreatedResponse(
            id=api_key.id,
            name=api_key.name,
            key_prefix=api_key.key_prefix,
            raw_key=raw_key,
            environment=api_key.environment.value if hasattr(api_key.environment, "value") else str(api_key.environment),
            tier=api_key.tier.value if hasattr(api_key.tier, "value") else str(api_key.tier),
            created_at=api_key.created_at,
        ).model_dump(mode="json"),
    }


# --- API PLATFORM ---
@router.delete("/{key_id}")
async def revoke_key(
    key_id: UUID,
    request: Request,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Soft revoke a developer API key."""

    result = await db.execute(
        select(DeveloperApiKey).where(DeveloperApiKey.id == key_id, DeveloperApiKey.developer_id == current_developer.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    api_key.is_active = False
    await db.flush()
    await log_audit(
        db,
        action="developer_api_key:revoke",
        resource_type="developer_api_key",
        user_id=current_developer.id,
        resource_id=api_key.id,
        changes={"name": api_key.name, "prefix": api_key.key_prefix},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is not None:
        await redis_client.delete(f"developer:api-key:{api_key.key_hash}")
    return {"success": True, "message": "API key revoked successfully", "data": RevokeAPIKeyResponse(id=api_key.id).model_dump(mode="json")}


# --- API PLATFORM ---
@router.get("/{key_id}/usage")
async def key_usage(
    key_id: UUID,
    period_days: int = 30,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return usage history for a single API key."""

    result = await db.execute(
        select(DeveloperApiKey).where(DeveloperApiKey.id == key_id, DeveloperApiKey.developer_id == current_developer.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    history = await get_usage_history(str(current_developer.id), str(api_key.id), period_days, db)
    return {"success": True, "message": "Usage history", "data": history.model_dump(mode="json")}
