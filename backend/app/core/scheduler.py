"""Background scheduler configuration."""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete

from app.tasks.news import queue_fetch_and_save_articles

# --- NEW ADDITION ---
from app.services.youtube_fetcher import fetch_and_save_reels

# --- API PLATFORM ---
from app.services import usage_service
from app.services import developer_api_key_service


scheduler = AsyncIOScheduler(timezone="UTC")


# --- SEC FIX SEC-001 ---
async def cleanup_expired_revoked_tokens() -> None:
    """Delete expired persistent token revocation records."""

    from datetime import datetime

    from app.db.session import AsyncSessionLocal
    from app.db.session_v2 import AsyncSessionLocalV2
    from app.models.revoked_token import RevokedToken

    async with AsyncSessionLocal() as db:
        await db.execute(delete(RevokedToken).where(RevokedToken.expires_at < datetime.utcnow()))
        await db.commit()
    async with AsyncSessionLocalV2() as db:
        await db.execute(delete(RevokedToken).where(RevokedToken.expires_at < datetime.utcnow()))
        await db.commit()


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

    # --- FIX 1: AUTO-PUBLISH SCHEDULED ARTICLES ---
    from app.tasks.workflow import auto_publish_scheduled_articles
    # --- DOCKER FIX ---
    from app.db.session import AsyncSessionLocal
    if not scheduler.get_job("auto_publish_scheduled"):
        scheduler.add_job(
            auto_publish_scheduled_articles,
            trigger="interval",
            seconds=60,
            id="auto_publish_scheduled",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            # --- DOCKER FIX ---
            args=[AsyncSessionLocal],
        )

    # --- API PLATFORM ---
    if not scheduler.get_job("sync_usage_counters"):
        scheduler.add_job(
            usage_service.sync_all_counters_to_db,
            trigger="interval",
            minutes=5,
            id="sync_usage_counters",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    # --- API PLATFORM ---
    if not scheduler.get_job("deactivate_expired_keys"):
        scheduler.add_job(
            developer_api_key_service.deactivate_expired_keys,
            trigger="interval",
            hours=1,
            id="deactivate_expired_keys",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    # --- API PLATFORM ---
    if not scheduler.get_job("daily_usage_summary"):
        scheduler.add_job(
            usage_service.generate_daily_summaries,
            trigger="cron",
            hour=0,
            minute=0,
            id="daily_usage_summary",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    # --- SEC FIX SEC-001 ---
    if not scheduler.get_job("cleanup_revoked_tokens"):
        scheduler.add_job(
            cleanup_expired_revoked_tokens,
            trigger="cron",
            hour=2,
            minute=0,
            id="cleanup_revoked_tokens",
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
