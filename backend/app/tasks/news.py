"""Celery tasks for news ingestion."""

from __future__ import annotations

import asyncio

from app.core.celery_app import celery_app
from app.services.news_fetcher import fetch_and_save_articles


@celery_app.task(name="daily_news_hub.fetch_and_save_articles")
def fetch_and_save_articles_task() -> dict[str, int]:
    """Fetch and persist latest articles in a worker process."""

    articles = asyncio.run(fetch_and_save_articles())
    return {"new_articles": len(articles)}


def queue_fetch_and_save_articles() -> dict[str, str]:
    """Enqueue the news ingestion task."""

    result = fetch_and_save_articles_task.delay()
    return {"task_id": result.id}
