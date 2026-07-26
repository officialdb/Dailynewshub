"""Analytics aggregation helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.bookmark import Bookmark
from app.models.category import Category
from app.models.notification import Notification
from app.models.user import User
from app.models.reel import Reel


async def get_analytics(db: AsyncSession) -> dict[str, Any]:
    """Aggregate dashboard metrics for admin consumption."""

    total_users = await db.scalar(select(func.count(User.id)))
    total_articles = await db.scalar(select(func.count(Article.id)))
    total_bookmarks = await db.scalar(select(func.count(Bookmark.id)))
    total_notifications = await db.scalar(select(func.count(Notification.id)))
    total_reels = await db.scalar(select(func.count(Reel.id)))

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    new_users_this_week = await db.scalar(select(func.count(User.id)).where(User.created_at >= week_ago))
    new_users_today = await db.scalar(select(func.count(User.id)).where(User.created_at >= today_start))
    articles_today = await db.scalar(select(func.count(Article.id)).where(Article.created_at >= today_start))

    articles_per_category_result = await db.execute(
        select(Category.name, func.count(Article.id))
        .join(Article, Article.category_id == Category.id, isouter=True)
        .group_by(Category.id)
        .order_by(Category.name.asc())
    )
    articles_per_category = [
        {"category": name, "count": count}
        for name, count in articles_per_category_result.all()
    ]

    most_bookmarked_result = await db.execute(
        select(
            Article.id,
            Article.title,
            func.count(Bookmark.id).label("bookmark_count"),
        )
        .join(Bookmark, Bookmark.article_id == Article.id, isouter=True)
        .group_by(Article.id)
        .order_by(func.count(Bookmark.id).desc(), Article.created_at.desc())
        .limit(5)
    )
    most_bookmarked_articles = [
        {
            "article_id": article_id,
            "title": title,
            "bookmark_count": bookmark_count,
        }
        for article_id, title, bookmark_count in most_bookmarked_result.all()
    ]

    return {
        "total_users": int(total_users or 0),
        "total_articles": int(total_articles or 0),
        "total_bookmarks": int(total_bookmarks or 0),
        "total_notifications": int(total_notifications or 0),
        "total_reels": int(total_reels or 0),
        "new_users_this_week": int(new_users_this_week or 0),
        "new_users_today": int(new_users_today or 0),
        "articles_today": int(articles_today or 0),
        "articles_per_category": articles_per_category,
        "most_bookmarked_articles": most_bookmarked_articles,
    }
