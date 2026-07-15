"""Category management routes."""


from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import build_versioned_key, bump_version, get_json, set_json
from app.core.dependencies import get_current_admin, get_db
from app.core.rate_limit import enforce_rate_limit
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate


router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    """Return all categories without authentication."""

    await enforce_rate_limit(request, scope="categories:list", limit=120, window_seconds=60)
    redis_client = getattr(request.app.state, "redis", None)
    cache_key = await build_versioned_key(redis_client, "categories", "list")
    cached = await get_json(redis_client, cache_key)
    if cached is not None:
        return {"success": True, "message": "Categories retrieved successfully", "data": cached}

    result = await db.execute(select(Category).order_by(Category.name.asc()))
    categories = result.scalars().all()
    payload = [CategoryResponse.model_validate(category).model_dump(mode="json") for category in categories]
    await set_json(redis_client, cache_key, payload, ttl_seconds=300)
    return {
        "success": True,
        "message": "Categories retrieved successfully",
        "data": payload,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    request: Request,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Create a category as an admin."""

    existing = await db.scalar(select(Category).where(Category.slug == category_in.slug))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")

    category = Category(**category_in.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    await bump_version(getattr(request.app.state, "redis", None), "categories")
    return {
        "success": True,
        "message": "Category created successfully",
        "data": CategoryResponse.model_validate(category).model_dump(mode="json"),
    }


@router.put("/{category_id}")
async def update_category(
    category_id: UUID,
    category_in: CategoryUpdate,
    request: Request,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Update a category as an admin."""

    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    update_data = category_in.model_dump(exclude_unset=True)
    if "slug" in update_data:
        duplicate = await db.scalar(select(Category).where(Category.slug == update_data["slug"], Category.id != category_id))
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")

    for key, value in update_data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    await bump_version(getattr(request.app.state, "redis", None), "categories")
    return {
        "success": True,
        "message": "Category updated successfully",
        "data": CategoryResponse.model_validate(category).model_dump(mode="json"),
    }


@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    request: Request,
    _: object = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete a category as an admin."""

    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    await db.delete(category)
    await db.commit()
    await bump_version(getattr(request.app.state, "redis", None), "categories")
    await bump_version(getattr(request.app.state, "redis", None), "articles")
    return {"success": True, "message": "Category deleted successfully", "data": {"id": str(category_id)}}
