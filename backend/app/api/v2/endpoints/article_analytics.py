"""Article analytics endpoints."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies_v2 import get_current_user, get_db
from app.core.rbac import require_permission
from app.models.article import Article
from app.models.article_analytic import ArticleAnalytic
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/articles", tags=["analytics"])


class ArticleAnalyticCreate(BaseModel):
    """Payload for submitting read analytics."""
    session_id: str
    read_depth_percent: float = Field(ge=0.0, le=100.0)
    time_spent_seconds: int = Field(ge=0, le=3600)
    source: str
    device_platform: str


@router.post("/{article_id}/analytics", status_code=status.HTTP_204_NO_CONTENT)
async def submit_article_analytics(
    article_id: UUID,
    body: ArticleAnalyticCreate,
    current_user: User | None = Depends(get_current_user), # Optional if we allow anonymous, but Depends requires token unless configured.
    db: AsyncSession = Depends(get_db),
) -> None:
    """Submit read analytics for an article (can be anonymous)."""
    # Verify article exists
    result = await db.execute(select(Article.id).where(Article.id == article_id, Article.is_deleted == False))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        
    analytic = ArticleAnalytic(
        article_id=article_id,
        user_id=current_user.id if getattr(current_user, "id", None) else None,
        session_id=body.session_id,
        read_depth_percent=body.read_depth_percent,
        time_spent_seconds=body.time_spent_seconds,
        source=body.source,
        device_platform=body.device_platform,
    )
    db.add(analytic)
    await db.commit()


@router.get("/{article_id}/analytics")
async def get_article_analytics(
    article_id: UUID,
    current_user: User = Depends(require_permission("article:view_all")), # Admins/Editors
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get aggregate analytics for an article."""
    
    # Base query for all analytics on this article
    base = select(ArticleAnalytic).where(ArticleAnalytic.article_id == article_id)
    
    # 1. Total views
    total_views = await db.scalar(select(func.count(ArticleAnalytic.id)).where(ArticleAnalytic.article_id == article_id)) or 0
    
    # 2. Unique readers
    unique_readers = await db.scalar(
        select(func.count(func.distinct(ArticleAnalytic.session_id))).where(ArticleAnalytic.article_id == article_id)
    ) or 0
    
    # 3. Averages
    avg_read_depth = await db.scalar(
        select(func.avg(ArticleAnalytic.read_depth_percent)).where(ArticleAnalytic.article_id == article_id)
    ) or 0.0
    
    avg_time_spent = await db.scalar(
        select(func.avg(ArticleAnalytic.time_spent_seconds)).where(ArticleAnalytic.article_id == article_id)
    ) or 0.0
    
    # 4. Completion rate (>= 80% read depth)
    completed_views = await db.scalar(
        select(func.count(ArticleAnalytic.id)).where(
            ArticleAnalytic.article_id == article_id,
            ArticleAnalytic.read_depth_percent >= 80.0
        )
    ) or 0
    completion_rate = (completed_views / total_views * 100) if total_views > 0 else 0.0
    
    # 5. Share count (from audit log or source)
    share_count = await db.scalar(
        select(func.count(ArticleAnalytic.id)).where(
            ArticleAnalytic.article_id == article_id,
            ArticleAnalytic.source == "share"
        )
    ) or 0
    
    # 6. Source & Platform breakdown
    sources_res = await db.execute(
        select(ArticleAnalytic.source, func.count(ArticleAnalytic.id))
        .where(ArticleAnalytic.article_id == article_id)
        .group_by(ArticleAnalytic.source)
    )
    source_breakdown = {s: c for s, c in sources_res.all()}
    
    platforms_res = await db.execute(
        select(ArticleAnalytic.device_platform, func.count(ArticleAnalytic.id))
        .where(ArticleAnalytic.article_id == article_id)
        .group_by(ArticleAnalytic.device_platform)
    )
    platform_breakdown = {p: c for p, c in platforms_res.all()}
    
    # 7. Daily views (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    daily_res = await db.execute(
        select(
            func.date(ArticleAnalytic.created_at).label("date"),
            func.count(ArticleAnalytic.id).label("count")
        )
        .where(ArticleAnalytic.article_id == article_id, ArticleAnalytic.created_at >= thirty_days_ago)
        .group_by("date")
        .order_by("date")
    )
    daily_views = [{"date": str(d), "count": c} for d, c in daily_res.all()]
    
    return {
        "success": True, 
        "message": "Analytics retrieved",
        "data": {
            "article_id": str(article_id),
            "total_views": total_views,
            "unique_readers": unique_readers,
            "avg_read_depth_percent": float(avg_read_depth),
            "avg_time_spent_seconds": float(avg_time_spent),
            "completion_rate": float(completion_rate),
            "share_count": share_count,
            "source_breakdown": source_breakdown,
            "platform_breakdown": platform_breakdown,
            "daily_views_last_30_days": daily_views
        }
    }
