"""Category management routes for the v2 NMS API."""

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
from app.models.category import Category
from app.models.user import User
from app.schemas.v2.category import CategoryCreateV2, CategoryResponseV2, CategoryUpdateV2

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["categories-v2"])


@router.get("")
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all categories (any authenticated user)."""
    result = await db.execute(select(Category).order_by(Category.name.asc()))
    categories = result.scalars().all()
    data = [CategoryResponseV2.model_validate(c).model_dump(mode="json") for c in categories]

    return {"success": True, "message": "Categories retrieved", "data": data}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreateV2,
    request: Request,
    current_user: User = Depends(require_permission("category:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new category."""
    existing = await db.scalar(select(Category).where(Category.slug == body.slug))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")

    category = Category(name=body.name, slug=body.slug, icon=body.icon)
    db.add(category)

    await log_audit(
        db,
        action="category:create",
        resource_type="category",
        user_id=current_user.id,
        resource_id=category.id,
        changes={"name": body.name, "slug": body.slug},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(category)

    return {"success": True, "message": "Category created", "data": CategoryResponseV2.model_validate(category).model_dump(mode="json")}


@router.put("/{category_id}")
async def update_category(
    category_id: UUID,
    body: CategoryUpdateV2,
    request: Request,
    current_user: User = Depends(require_permission("category:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update a category."""
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    changes: dict[str, Any] = {}
    update_data = body.model_dump(exclude_unset=True)

    if "slug" in update_data:
        dup = await db.scalar(select(Category).where(Category.slug == update_data["slug"], Category.id != category_id))
        if dup is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")

    for field, value in update_data.items():
        setattr(category, field, value)
        changes[field] = value

    await log_audit(
        db,
        action="category:update",
        resource_type="category",
        user_id=current_user.id,
        resource_id=category.id,
        changes=changes or None,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(category)

    return {"success": True, "message": "Category updated", "data": CategoryResponseV2.model_validate(category).model_dump(mode="json")}


@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("category:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a category."""
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    await log_audit(
        db,
        action="category:delete",
        resource_type="category",
        user_id=current_user.id,
        resource_id=category.id,
        changes={"name": category.name, "slug": category.slug},
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(category)
    await db.commit()

    return {"success": True, "message": "Category deleted"}
