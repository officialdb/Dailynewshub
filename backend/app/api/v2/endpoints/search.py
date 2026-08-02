"""Full-text search routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Integer, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission
from app.models.article import Article
from app.models.enums import ArticleStatus
from app.models.user import User
from app.schemas.v2.search import SearchResult, SearchResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search-v2"])


@router.get("/articles")
async def search_articles(
    q: str = Query(min_length=1, max_length=300),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    status_filter: ArticleStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Full-text search across articles.

    Searches title, description, content, and author. Results ranked by
    relevance: title matches first, then published recency.
    """
    from app.core.rbac import has_permission

    pattern = f"%{q}%"

    base_query = select(Article).options(
        selectinload(Article.category),
        selectinload(Article.reporter),
    )
    count_query = select(func.count(Article.id))

    if not has_permission(current_user, "article:view_all"):
        base_query = base_query.where(Article.reporter_id == current_user.id)
        count_query = count_query.where(Article.reporter_id == current_user.id)

    if status_filter:
        base_query = base_query.where(Article.status == status_filter)
        count_query = count_query.where(Article.status == status_filter)

    search_filter = or_(
        Article.title.ilike(pattern),
        Article.description.ilike(pattern),
        Article.content.ilike(pattern),
        Article.author.ilike(pattern),
    )
    base_query = base_query.where(search_filter)
    count_query = count_query.where(search_filter)

    total = int(await db.scalar(count_query) or 0)

    # Rank: title matches first, then by recency
    title_boost = case(
        (Article.title.ilike(pattern), 1),
        else_=0,
    )

    result = await db.execute(
        base_query
        .order_by(
            title_boost.desc(),
            Article.published_at.desc().nullslast(),
            Article.created_at.desc(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
    )
    articles = result.scalars().unique().all()

    items = [
        SearchResult(
            id=str(a.id),
            title=a.title,
            description=a.description[:200] if a.description else None,
            status=a.status.value,
            category_name=a.category.name if a.category else None,
            reporter_name=a.reporter.name if a.reporter else None,
            published_at=a.published_at.isoformat() if a.published_at else None,
            created_at=a.created_at.isoformat(),
        ).model_dump(mode="json")
        for a in articles
    ]

    pages = (total + limit - 1) // limit if total else 0
    resp = SearchResponse(
        items=items, total=total, page=page, limit=limit, pages=pages, query=q,
    )
    return {"success": True, "message": f"Found {total} results", "data": resp.model_dump(mode="json")}
