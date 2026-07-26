"""Celery tasks for news ingestion and recommendation pre-computation."""

from __future__ import annotations

import asyncio
import logging

from app.core.celery_app import celery_app
from app.services.news_fetcher import fetch_and_save_articles

logger = logging.getLogger(__name__)


@celery_app.task(name="daily_news_hub.fetch_and_save_articles")
def fetch_and_save_articles_task() -> dict[str, int]:
    """Fetch and persist latest articles in a worker process."""

    articles = asyncio.run(fetch_and_save_articles())
    return {"new_articles": len(articles)}


def queue_fetch_and_save_articles() -> dict[str, str]:
    """Enqueue the news ingestion task."""

    result = fetch_and_save_articles_task.delay()
    return {"task_id": result.id}


@celery_app.task(name="daily_news_hub.recompute_reel_recommendations")
def recompute_reel_recommendations_task() -> dict[str, int]:
    """Pre-compute reel recommendations for all active users.

    Runs every 6 hours via Celery beat.  Reads watch history,
    scores candidates, and writes the ranked list to Redis.
    """

    async def _run() -> int:
        from sqlalchemy import select
        from app.db.session import AsyncSessionLocal
        from app.models.user import User
        from app.models.reel_watch_event import ReelWatchEvent
        from app.services.reels_recommender import (
            compute_recommendations,
            set_cached_recommendations,
            mark_recomputed,
        )
        from app.core.config import get_settings
        import redis.asyncio as aioredis

        settings = get_settings()
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

        count = 0
        try:
            async with AsyncSessionLocal() as db:
                # Find all users who have at least 1 watch event
                result = await db.execute(
                    select(ReelWatchEvent.user_id).distinct()
                )
                user_ids = [row[0] for row in result.all()]

                for uid in user_ids:
                    try:
                        recs = await compute_recommendations(uid, db)
                        await set_cached_recommendations(uid, recs, redis_client)
                        await mark_recomputed(uid, redis_client)
                        count += 1
                    except Exception as exc:
                        logger.warning(
                            "Failed to compute recs for user %s: %s", uid, exc
                        )
        finally:
            await redis_client.aclose()

        return count

    users_updated = asyncio.run(_run())
    logger.info("Recomputed reel recommendations for %d users", users_updated)
    return {"users_updated": users_updated}
