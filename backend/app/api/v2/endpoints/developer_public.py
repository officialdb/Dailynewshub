"""Public developer-facing routes protected by developer API keys."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.api_key_auth import get_api_key_consumer
from app.core.dependencies_v2 import get_db
from app.models.article import Article
from app.models.category import Category
from app.models.enums import ArticleStatus, DeveloperTier
from app.models.reel import Reel
from app.schemas.v2.category import CategoryResponseV2
# --- API PLATFORM ---
router = APIRouter(prefix="/public")


def _article_response(article: Article) -> dict[str, Any]:
    """Serialize a public article payload."""

    return {
        "id": str(article.id),
        "title": article.title,
        "description": article.description,
        "content": article.content,
        "image_url": article.image_url,
        "author": article.author,
        "source_name": article.source_name,
        "source_url": article.source_url,
        "category": article.category.name if article.category else None,
        "tags": [tag.name for tag in getattr(article, "tags", [])] if getattr(article, "tags", None) else [],
        "published_at": article.published_at.isoformat() if article.published_at else None,
        "ai_summary": getattr(article, "ai_summary", None),
    }


def _paginated(items: list[dict[str, Any]], total: int, page: int, limit: int) -> dict[str, Any]:
    """Build a paginated response payload."""

    pages = (total + limit - 1) // limit if total else 0
    return {
        "success": True,
        "data": items,
        "meta": {"total": total, "page": page, "per_page": limit, "total_pages": pages},
    }


def _tier_limit(tier: str, free_limit: int, starter_limit: int, pro_limit: int) -> int:
    """Resolve a max limit for the developer tier."""

    if tier == DeveloperTier.STARTER.value:
        return starter_limit
    if tier in {DeveloperTier.PRO.value, DeveloperTier.ENTERPRISE.value}:
        return pro_limit
    return free_limit


# --- API PLATFORM ---
@router.get("/articles/trending")
async def trending_articles(
    limit: int = Query(default=10, ge=1, le=20),
    category: str | None = None,
    consumer=Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return top articles by view count."""

    query = select(Article).options(selectinload(Article.category)).where(Article.status == ArticleStatus.PUBLISHED)
    if category:
        query = query.join(Category).where(or_(Category.slug == category, Category.name == category))
    result = await db.execute(query.order_by(Article.view_count.desc(), Article.published_at.desc().nullslast()).limit(limit))
    items = [_article_response(article) for article in result.scalars().unique().all()]
    return {"success": True, "message": "Trending articles retrieved", "data": items}


# --- API PLATFORM ---
@router.get("/reels")
async def public_reels(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    category: str | None = None,
    channel_id: str | None = None,
    consumer=Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return public reel metadata for developer consumers."""

    tier = getattr(request.state, "tier", DeveloperTier.FREE.value)
    limit = min(limit, _tier_limit(tier, 10, 50, 100))
    query = select(Reel).options(selectinload(Reel.category))
    if category:
        query = query.join(Category).where(or_(Category.slug == category, Category.name == category))
    if channel_id:
        query = query.where(Reel.channel_id == channel_id)
    count_stmt = select(func.count(Reel.id))
    if category:
        count_stmt = count_stmt.join(Category).where(or_(Category.slug == category, Category.name == category))
    if channel_id:
        count_stmt = count_stmt.where(Reel.channel_id == channel_id)
    total = int(await db.scalar(count_stmt) or 0)
    result = await db.execute(query.order_by(Reel.view_count.desc(), Reel.created_at.desc()).offset((page - 1) * limit).limit(limit))
    items = [
        {
            "id": str(reel.id),
            "title": reel.title,
            "youtube_video_id": reel.youtube_video_id,
            "thumbnail_url": reel.thumbnail_url,
            "channel_name": reel.channel_name,
            "category": reel.category.name if getattr(reel, "category", None) else None,
            "duration_seconds": reel.duration_seconds,
            "view_count": reel.view_count,
            "like_count": reel.like_count,
            "published_at": reel.published_at.isoformat() if reel.published_at else None,
            "aspect_ratio": reel.aspect_ratio,
        }
        for reel in result.scalars().unique().all()
    ]
    return {"success": True, "message": "Reels retrieved", "data": _paginated(items, total, page, limit)}


# --- API PLATFORM ---
@router.post("/users")
async def register_external_user(
    body: dict[str, Any],
    request: Request,
    consumer=Depends(get_api_key_consumer),
) -> dict[str, Any]:
    """Register a developer-namespaced user for recommendations."""

    tier = getattr(request.state, "tier", DeveloperTier.FREE.value)
    if tier not in {DeveloperTier.PRO.value, DeveloperTier.ENTERPRISE.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This endpoint requires Pro tier or above")

    user_identifier = str(body.get("user_identifier", "")).strip()
    preferences = body.get("category_preferences", [])
    if not user_identifier:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="user_identifier is required")

    redis_client = getattr(request.app.state, "redis", None)
    created_at = datetime.now(timezone.utc).isoformat()
    if redis_client is not None:
        payload = {"user_identifier": user_identifier, "category_preferences": preferences, "created_at": created_at}
        await redis_client.set(f"developer:user:{request.state.developer_id}:{user_identifier}", json.dumps(payload))
    return {"success": True, "message": "User registered", "data": {"user_identifier": user_identifier, "created_at": created_at}}


# --- API PLATFORM ---
@router.post("/users/{user_identifier}/events")
async def record_external_event(
    user_identifier: str,
    body: dict[str, Any],
    request: Request,
    consumer=Depends(get_api_key_consumer),
) -> dict[str, Any]:
    """Record a recommendation-training event."""

    tier = getattr(request.state, "tier", DeveloperTier.FREE.value)
    if tier not in {DeveloperTier.PRO.value, DeveloperTier.ENTERPRISE.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This endpoint requires Pro tier or above")

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is not None:
        event = {
            "event_type": body.get("event_type"),
            "article_id": body.get("article_id"),
            "watch_duration_seconds": body.get("watch_duration_seconds"),
            "completion_rate": body.get("completion_rate"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await redis_client.rpush(f"developer:user-events:{request.state.developer_id}:{user_identifier}", json.dumps(event))
    return {"success": True, "message": "Event recorded"}


# --- API PLATFORM ---
@router.get("/recommendations")
async def recommendations(
    request: Request,
    user_identifier: str = Query(min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
    category: str | None = None,
    consumer=Depends(get_api_key_consumer),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return a ranked list of articles for an external user namespace."""

    tier = getattr(request.state, "tier", DeveloperTier.FREE.value)
    if tier not in {DeveloperTier.PRO.value, DeveloperTier.ENTERPRISE.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This endpoint requires Pro tier or above")

    redis_client = getattr(request.app.state, "redis", None)
    profile_raw = await redis_client.get(f"developer:user:{request.state.developer_id}:{user_identifier}") if redis_client is not None else None
    if not profile_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registered user not found")
    profile = json.loads(profile_raw)
    preferred_categories = {str(item).lower() for item in profile.get("category_preferences", [])}

    query = select(Article).options(selectinload(Article.category)).where(Article.status == ArticleStatus.PUBLISHED)
    if category:
        query = query.join(Category).where(or_(Category.slug == category, Category.name == category))
    result = await db.execute(query.limit(200))
    articles = result.scalars().unique().all()
    scored: list[tuple[Article, float]] = []
    for article in articles:
        score = 0.0
        if article.category and article.category.name and article.category.name.lower() in preferred_categories:
            score += 3.0
        if article.category and article.category.slug and article.category.slug.lower() in preferred_categories:
            score += 3.0
        score += min(article.view_count / 100.0, 5.0)
        if article.published_at:
            hours = (datetime.now(timezone.utc) - article.published_at).total_seconds() / 3600
            score += max(0.0, 3.0 - min(hours, 24.0) / 8.0)
        scored.append((article, score))
    scored.sort(key=lambda item: (item[1], item[0].published_at or item[0].created_at), reverse=True)
    return {"success": True, "message": "Recommendations retrieved", "data": [_article_response(article) for article, _ in scored[:limit]]}
