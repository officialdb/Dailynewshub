"""Tag management routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_db, get_current_user
from app.core.rbac import require_permission
from app.models.tag import Tag
from app.models.user import User
from app.schemas.v2.tag import TagCreate, TagResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tags", tags=["tags-v2"])


@router.get("")
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all tags (any authenticated user)."""
    result = await db.execute(select(Tag).order_by(Tag.name.asc()))
    tags = result.scalars().all()
    data = [TagResponse.model_validate(t).model_dump(mode="json") for t in tags]

    return {"success": True, "message": "Tags retrieved", "data": data}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tag(
    body: TagCreate,
    request: Request,
    current_user: User = Depends(require_permission("tag:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new tag."""
    existing = await db.scalar(select(Tag).where(Tag.slug == body.slug))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag slug already exists")

    existing_name = await db.scalar(select(Tag).where(Tag.name == body.name))
    if existing_name is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag name already exists")

    tag = Tag(name=body.name, slug=body.slug)
    db.add(tag)

    await log_audit(
        db,
        action="tag:create",
        resource_type="tag",
        user_id=current_user.id,
        resource_id=tag.id,
        changes={"name": body.name, "slug": body.slug},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(tag)

    return {"success": True, "message": "Tag created", "data": TagResponse.model_validate(tag).model_dump(mode="json")}


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("tag:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a tag."""
    tag = await db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    await log_audit(
        db,
        action="tag:delete",
        resource_type="tag",
        user_id=current_user.id,
        resource_id=tag.id,
        changes={"name": tag.name},
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(tag)
    await db.commit()

    return {"success": True, "message": "Tag deleted"}
