"""Public news API routes — API-key-protected endpoints for third-party consumers."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.api_key_auth import get_api_key_consumer
from app.core.dependencies_v2 import get_db
from app.core.rate_limit import limiter
from app.models.article import Article
from app.models.category import Category
from app.models.enums import ArticleStatus
from app.models.developer_api_key import DeveloperApiKey
from app.schemas.v2.category import CategoryResponseV2

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public-v2"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


def _article_public_response(article: Article) -> dict[str, Any]:
    """Public article response — limited fields, no internal metadata."""
    return {
        "id": str(article.id),
        "title": article.title,
        "description": article.description,
        "content": article.content,
        "image_url": article.image_url,
        "author": article.author,
        "source_name": article.source_name,
        "category": article.category.name if article.category else None,
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "view_count": article.view_count,
    }


@router.get("/articles")
@limiter.limit("60/minute")  # --- SEC FIX SEC-006 ---
async def list_public_articles(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    category_slug: str | None = Query(default=None, max_length=255),
    consumer: DeveloperApiKey = Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List published articles. Requires ``X-API-Key`` header."""
    # --- API PLATFORM ---
    tier = getattr(request.state, "tier", "free")
    if tier == "starter":
        limit = min(limit, 50)
    elif tier in {"pro", "enterprise"}:
        limit = min(limit, 100)
    else:
        limit = min(limit, 10)
    base_query = select(Article).options(
        selectinload(Article.category),
    ).where(Article.status == ArticleStatus.PUBLISHED)
    count_query = select(func.count(Article.id)).where(Article.status == ArticleStatus.PUBLISHED)

    if category_slug:
        cat_result = await db.execute(select(Category.id).where(Category.slug == category_slug))
        cat_id = cat_result.scalar_one_or_none()
        if cat_id is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        base_query = base_query.where(Article.category_id == cat_id)
        count_query = count_query.where(Article.category_id == cat_id)

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(
        base_query
        .order_by(Article.published_at.desc().nullslast(), Article.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    articles = [_article_public_response(a) for a in result.scalars().unique().all()]

    return {"success": True, "message": "Articles retrieved", "data": _paginate(articles, total, page, limit)}


@router.get("/articles/search")
@limiter.limit("30/minute")  # --- SEC FIX SEC-006 ---
async def search_public_articles(
    request: Request,
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    consumer: DeveloperApiKey = Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Search published articles. Requires ``X-API-Key`` header."""
    # --- API PLATFORM ---
    tier = getattr(request.state, "tier", "free")
    if tier == "starter":
        limit = min(limit, 50)
    elif tier in {"pro", "enterprise"}:
        limit = min(limit, 100)
    else:
        limit = min(limit, 10)
    pattern = f"%{q}%"
    base_query = select(Article).options(
        selectinload(Article.category),
    ).where(
        Article.status == ArticleStatus.PUBLISHED,
        or_(Article.title.ilike(pattern), Article.description.ilike(pattern)),
    )
    count_query = select(func.count(Article.id)).where(
        Article.status == ArticleStatus.PUBLISHED,
        or_(Article.title.ilike(pattern), Article.description.ilike(pattern)),
    )

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(
        base_query
        .order_by(Article.published_at.desc().nullslast())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    articles = [_article_public_response(a) for a in result.scalars().unique().all()]

    return {"success": True, "message": "Search results retrieved", "data": _paginate(articles, total, page, limit)}


@router.get("/articles/{article_id}")
async def get_public_article(
    article_id: UUID,
    consumer: DeveloperApiKey = Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a single published article. Requires ``X-API-Key`` header."""
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.category))
        .where(Article.id == article_id, Article.status == ArticleStatus.PUBLISHED)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.view_count += 1
    await db.commit()

    return {"success": True, "message": "Article retrieved", "data": _article_public_response(article)}


@router.get("/categories")
async def list_public_categories(
    consumer: DeveloperApiKey = Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all categories. Requires ``X-API-Key`` header."""
    result = await db.execute(select(Category).order_by(Category.name.asc()))
    categories = result.scalars().all()
    data = [CategoryResponseV2.model_validate(c).model_dump(mode="json") for c in categories]

    return {"success": True, "message": "Categories retrieved", "data": data}
