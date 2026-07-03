"""Celery application configuration for Daily News Hub."""

from __future__ import annotations

from celery import Celery

from app.core.config import get_settings


settings = get_settings()

celery_app = Celery(
    "daily_news_hub",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.news"],
)

celery_app.autodiscover_tasks(["app.tasks"])
celery_app.conf.beat_schedule = {
    "fetch-news-every-15-minutes": {
        "task": "daily_news_hub.fetch_and_save_articles",
        "schedule": 900.0,
    },
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)
