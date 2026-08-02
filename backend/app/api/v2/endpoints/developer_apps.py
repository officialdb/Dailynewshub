"""Developer app management routes."""

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
from app.schemas.api_key import APIKeyResponse
from app.schemas.developer_app import AppResponse, CreateAppRequest, UpdateAppRequest


# --- API PLATFORM ---
router = APIRouter(prefix="/apps")


MAX_APPS_BY_TIER: dict[str, int | None] = {
    DeveloperTier.FREE.value: 1,
    DeveloperTier.STARTER.value: 3,
    DeveloperTier.PRO.value: 10,
    DeveloperTier.ENTERPRISE.value: None,
}


# --- API PLATFORM ---
def _serialize_app(app: DeveloperApp) -> AppResponse:
    """Serialize an app ORM instance including its active keys."""

    return AppResponse(
        id=app.id,
        name=app.name,
        description=app.description,
        is_active=app.is_active,
        api_keys=[APIKeyResponse.model_validate(api_key) for api_key in app.api_keys],
        created_at=app.created_at,
    )


# --- API PLATFORM ---
@router.get("")
async def list_apps(
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all apps for the authenticated developer."""

    result = await db.execute(
        select(DeveloperApp)
        .options(selectinload(DeveloperApp.api_keys))
        .where(DeveloperApp.developer_id == current_developer.id)
        .order_by(DeveloperApp.created_at.desc())
    )
    apps = result.scalars().unique().all()
    return {"success": True, "message": "Apps retrieved", "data": [_serialize_app(app).model_dump(mode="json") for app in apps]}


# --- API PLATFORM ---
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_app(
    body: CreateAppRequest,
    request: Request,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new developer app."""

    tier = current_developer.tier.value if hasattr(current_developer.tier, "value") else str(current_developer.tier)
    max_apps = MAX_APPS_BY_TIER.get(tier, 1)
    if max_apps is not None:
        active_count = await db.scalar(
            select(func.count(DeveloperApp.id)).where(
                DeveloperApp.developer_id == current_developer.id,
                DeveloperApp.is_active.is_(True),
            )
        )
        if int(active_count or 0) >= max_apps:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="App limit reached for your tier")

    app = DeveloperApp(
        developer_id=current_developer.id,
        name=body.name,
        description=body.description,
    )
    db.add(app)
    await db.flush()
    await log_audit(
        db,
        action="developer_app:create",
        resource_type="developer_app",
        user_id=current_developer.id,
        resource_id=app.id,
        changes={"name": body.name},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(app)
    await db.refresh(app, attribute_names=["api_keys"])
    return {"success": True, "message": "App created", "data": _serialize_app(app).model_dump(mode="json")}


# --- API PLATFORM ---
@router.get("/{app_id}")
async def get_app(
    app_id: UUID,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return a single developer app."""

    result = await db.execute(
        select(DeveloperApp)
        .options(selectinload(DeveloperApp.api_keys))
        .where(DeveloperApp.id == app_id, DeveloperApp.developer_id == current_developer.id)
    )
    app = result.scalar_one_or_none()
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    return {"success": True, "message": "App retrieved", "data": _serialize_app(app).model_dump(mode="json")}


# --- API PLATFORM ---
@router.patch("/{app_id}")
async def update_app(
    app_id: UUID,
    body: UpdateAppRequest,
    request: Request,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update a developer app."""

    result = await db.execute(
        select(DeveloperApp)
        .options(selectinload(DeveloperApp.api_keys))
        .where(DeveloperApp.id == app_id, DeveloperApp.developer_id == current_developer.id)
    )
    app = result.scalar_one_or_none()
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    await log_audit(
        db,
        action="developer_app:update",
        resource_type="developer_app",
        user_id=current_developer.id,
        resource_id=app.id,
        changes=body.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(app)
    await db.refresh(app, attribute_names=["api_keys"])
    return {"success": True, "message": "App updated", "data": _serialize_app(app).model_dump(mode="json")}


# --- API PLATFORM ---
@router.delete("/{app_id}")
async def delete_app(
    app_id: UUID,
    request: Request,
    current_developer: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Soft delete an app and revoke its keys."""

    result = await db.execute(
        select(DeveloperApp)
        .options(selectinload(DeveloperApp.api_keys))
        .where(DeveloperApp.id == app_id, DeveloperApp.developer_id == current_developer.id)
    )
    app = result.scalar_one_or_none()
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    app.is_active = False
    for api_key in app.api_keys:
        api_key.is_active = False
    await log_audit(
        db,
        action="developer_app:delete",
        resource_type="developer_app",
        user_id=current_developer.id,
        resource_id=app.id,
        changes={"name": app.name},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"success": True, "message": "App deleted"}
