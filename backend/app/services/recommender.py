"""Preference-based article recommendation engine.

Scores articles based on user engagement signals:
- Category preferences (+3 per match)
- Followed channels (+3 per match)
- Reading history categories (+2 per match)
- Bookmarked article categories (+2 per match)
- Trending/Featured/Pinned bonuses (+2 each)
- View count popularity (+1 per 100 views, max +5)
- Recency bonus (up to +3 for articles published within 24h)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.bookmark import Bookmark
from app.models.category import Category
from app.models.followed_channel import FollowedChannel
from app.models.user import User

logger = logging.getLogger(__name__)

# Scoring weights
CATEGORY_PREF_WEIGHT = 3
FOLLOWED_CHANNEL_WEIGHT = 3
READING_HISTORY_WEIGHT = 2
BOOKMARK_CATEGORY_WEIGHT = 2
TRENDING_BONUS = 2
FEATURED_BONUS = 2
PINNED_BONUS = 2
MAX_VIEW_BONUS = 5
VIEW_BONUS_DIVISOR = 100
RECENCY_MAX_BONUS = 3
RECENCY_WINDOW_HOURS = 24


async def get_user_interest_profile(
    user: User,
    db: AsyncSession,
) -> dict:
    """Build an interest profile for a user based on their activity."""

    # 1. Preferred category names (from onboarding / settings)
    preferred_categories: set[str] = set()
    if user.preferences:
        preferred_categories = {p.lower() for p in user.preferences}

    # 2. Followed channel IDs
    result = await db.execute(
        select(FollowedChannel.channel_id).where(
            FollowedChannel.user_id == user.id
        )
    )
    followed_channel_ids: set[str] = {
        row[0] for row in result.all()
    }

    # 3. Categories from reading history
    history_category_names: set[str] = set()
    if user.reading_history:
        history_ids = []
        for aid in user.reading_history[:50]:
            try:
                history_ids.append(UUID(str(aid)))
            except (ValueError, TypeError):
                continue
        if history_ids:
            result = await db.execute(
                select(Category.name)
                .join(Article, Article.category_id == Category.id)
                .where(Article.id.in_(history_ids))
            )
            history_category_names = {
                row[0].lower() for row in result.all() if row[0]
            }

    # 4. Categories from bookmarked articles
    bookmark_category_names: set[str] = set()
    result = await db.execute(
        select(Category.name)
        .select_from(Bookmark)
        .join(Article, Bookmark.article_id == Article.id)
        .join(Category, Article.category_id == Category.id)
        .where(Bookmark.user_id == user.id, Bookmark.article_id.isnot(None))
    )
    bookmark_category_names = {
        row[0].lower() for row in result.all() if row[0]
    }

    return {
        "preferred_categories": preferred_categories,
        "followed_channel_ids": followed_channel_ids,
        "history_categories": history_category_names,
        "bookmark_categories": bookmark_category_names,
    }


def score_article(
    article: Article,
    profile: dict,
    now: datetime | None = None,
) -> float:
    """Score a single article against a user interest profile."""

    if now is None:
        now = datetime.now(timezone.utc)

    score = 0.0

    cat_name = ""
    if article.category and article.category.name:
        cat_name = article.category.name.lower()

    # Category preference match
    if cat_name and cat_name in profile["preferred_categories"]:
        score += CATEGORY_PREF_WEIGHT

    # Followed channel match (compare source_name to channel IDs/names)
    source = (article.source_name or "").lower()
    for ch_id in profile["followed_channel_ids"]:
        if ch_id.lower() in source or source in ch_id.lower():
            score += FOLLOWED_CHANNEL_WEIGHT
            break

    # Reading history category match
    if cat_name and cat_name in profile["history_categories"]:
        score += READING_HISTORY_WEIGHT

    # Bookmark category match
    if cat_name and cat_name in profile["bookmark_categories"]:
        score += BOOKMARK_CATEGORY_WEIGHT

    # Trending / Featured / Pinned bonuses
    if article.is_trending:
        score += TRENDING_BONUS
    if article.is_featured:
        score += FEATURED_BONUS
    if article.is_pinned:
        score += PINNED_BONUS

    # View count popularity (diminishing returns)
    view_bonus = min(article.view_count / VIEW_BONUS_DIVISOR, MAX_VIEW_BONUS)
    score += view_bonus

    # Recency bonus (up to 3 points for articles within 24h)
    if article.published_at:
        pub = article.published_at
        if pub.tzinfo is None:
            pub = pub.replace(tzinfo=timezone.utc)
        hours_ago = (now - pub).total_seconds() / 3600
        if hours_ago < RECENCY_WINDOW_HOURS:
            recency_score = RECENCY_MAX_BONUS * (
                1 - hours_ago / RECENCY_WINDOW_HOURS
            )
            score += recency_score

    return round(score, 2)


async def rank_articles_for_user(
    articles: list[Article],
    user: User,
    db: AsyncSession,
) -> list[Article]:
    """Rank a list of articles by relevance score for a given user."""

    profile = await get_user_interest_profile(user, db)

    now = datetime.now(timezone.utc)
    scored = [
        (article, score_article(article, profile, now))
        for article in articles
    ]

    # Sort by score descending, then by published_at descending as tiebreaker
    scored.sort(
        key=lambda pair: (
            pair[1],
            pair[0].published_at or pair[0].created_at,
        ),
        reverse=True,
    )

    return [article for article, _ in scored]
