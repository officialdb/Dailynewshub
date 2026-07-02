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


async def get_analytics(db: AsyncSession) -> dict[str, Any]:
    """Aggregate dashboard metrics for admin consumption."""

    total_users = await db.scalar(select(func.count(User.id)))
    total_articles = await db.scalar(select(func.count(Article.id)))
    total_bookmarks = await db.scalar(select(func.count(Bookmark.id)))
    total_notifications_sent = await db.scalar(select(func.count(Notification.id)))

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_this_week = await db.scalar(select(func.count(User.id)).where(User.created_at >= week_ago))

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
        "articles_per_category": articles_per_category,
        "most_bookmarked_articles": most_bookmarked_articles,
        "new_users_this_week": int(new_users_this_week or 0),
        "total_notifications_sent": int(total_notifications_sent or 0),
        "total_bookmarks": int(total_bookmarks or 0),
    }

