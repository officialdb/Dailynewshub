"""Background scheduler configuration."""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.tasks.news import queue_fetch_and_save_articles

# --- NEW ADDITION ---
from app.services.youtube_fetcher import fetch_and_save_reels


scheduler = AsyncIOScheduler(timezone="UTC")


def setup_scheduler() -> None:
    """Register scheduled background jobs."""

    if not scheduler.get_job("fetch_news_articles"):
        scheduler.add_job(
            queue_fetch_and_save_articles,
            trigger="interval",
            minutes=30,
            id="fetch_news_articles",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    # --- NEW ADDITION ---
    if not scheduler.get_job("fetch_reels"):
        scheduler.add_job(
            fetch_and_save_reels,
            trigger="interval",
            minutes=30,
            id="fetch_reels",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )


def start_scheduler() -> None:
    """Start the APScheduler event loop if it is not already running."""

    setup_scheduler()
    if not scheduler.running:
        scheduler.start()


def shutdown_scheduler() -> None:
    """Stop the scheduler and clear scheduled jobs."""

    if scheduler.running:
        scheduler.shutdown(wait=False)
