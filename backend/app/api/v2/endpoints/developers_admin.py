"""Admin endpoints for managing external developer accounts."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_db, get_current_user
from app.core.rbac import require_permission
from app.models.developer import Developer
from app.models.user import User
from app.schemas.v2.developer_admin import DeveloperAdminResponse, DeveloperStatusUpdate, DeveloperAdminUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/developers", tags=["admin-developers-v2"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


@router.get("")
async def list_developers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    current_user: User = Depends(require_permission("user:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all developer accounts with optional search."""
    base = select(Developer)
    count_base = select(func.count(Developer.id))

    if search:
        pattern = f"%{search}%"
        filters = or_(
            Developer.name.ilike(pattern),
            Developer.email.ilike(pattern),
            Developer.company_name.ilike(pattern),
        )
        base = base.where(filters)
        count_base = count_base.where(filters)

    total = int(await db.scalar(count_base) or 0)
    result = await db.execute(
        base.order_by(Developer.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    developers = result.scalars().all()
    data = [DeveloperAdminResponse.model_validate(dev).model_dump(mode="json") for dev in developers]

    return {"success": True, "message": "Developers retrieved", "data": _paginate(data, total, page, limit)}


@router.get("/{developer_id}")
async def get_developer(
    developer_id: UUID,
    current_user: User = Depends(require_permission("user:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a single developer account."""
    result = await db.execute(select(Developer).where(Developer.id == developer_id))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Developer not found")

    return {
        "success": True,
        "message": "Developer retrieved",
        "data": DeveloperAdminResponse.model_validate(developer).model_dump(mode="json"),
    }


@router.patch("/{developer_id}/status")
async def update_developer_status(
    developer_id: UUID,
    body: DeveloperStatusUpdate,
    request: Request,
    current_user: User = Depends(require_permission("user:edit")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Activate or suspend a developer account."""
    result = await db.execute(select(Developer).where(Developer.id == developer_id))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Developer not found")

    developer.is_active = body.is_active

    await log_audit(
        db,
        action="developer:update_status",
        resource_type="developer",
        user_id=current_user.id,
        resource_id=developer.id,
        changes={"is_active": body.is_active},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    return {
        "success": True,
        "message": "Developer status updated",
        "data": DeveloperAdminResponse.model_validate(developer).model_dump(mode="json"),
    }


@router.put("/{developer_id}")
async def update_developer(
    developer_id: UUID,
    body: DeveloperAdminUpdate,
    request: Request,
    current_user: User = Depends(require_permission("user:edit")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Full update of a developer account (name, email, tier, etc)."""
    result = await db.execute(select(Developer).where(Developer.id == developer_id))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Developer not found")

    changes: dict[str, Any] = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        if getattr(developer, field) != value:
            changes[field] = value
            setattr(developer, field, value)

    if changes:
        await log_audit(
            db,
            action="developer:update",
            resource_type="developer",
            user_id=current_user.id,
            resource_id=developer.id,
            changes=changes,
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()
        await db.refresh(developer)

    return {
        "success": True,
        "message": "Developer updated",
        "data": DeveloperAdminResponse.model_validate(developer).model_dump(mode="json"),
    }


@router.delete("/{developer_id}")
async def delete_developer(
    developer_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("user:delete")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Delete a developer account and all associated apps/keys."""
    result = await db.execute(select(Developer).where(Developer.id == developer_id))
    developer = result.scalar_one_or_none()
    if developer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Developer not found")

    await log_audit(
        db,
        action="developer:delete",
        resource_type="developer",
        user_id=current_user.id,
        resource_id=developer.id,
        changes={"email": developer.email},
        ip_address=request.client.host if request.client else None,
    )
    
    await db.delete(developer)
    await db.commit()

    return {"success": True, "message": "Developer account deleted"}
