"""Usage logging and reporting helpers for developer API traffic."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from statistics import fmean
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage_counter import UsageCounter
from app.models.usage_log import UsageLog
from app.schemas.usage import DailyUsagePoint, TopEndpointResponse, UsageHistoryResponse, UsageStatsResponse
from app.services.developer_api_key_service import TIER_LIMITS


# --- API PLATFORM ---
async def log_request(
    api_key_id: str,
    developer_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: int,
    ip_address: str | None,
    user_agent: str | None,
    error_message: str | None,
    db: AsyncSession,
) -> None:
    """Persist a single usage log record."""

    entry = UsageLog(
        api_key_id=UUID(api_key_id),
        developer_id=UUID(developer_id),
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        response_time_ms=response_time_ms,
        ip_address=ip_address,
        user_agent=user_agent,
        error_message=error_message,
    )
    db.add(entry)
    await db.commit()


# --- API PLATFORM ---
async def get_usage_stats(
    developer_id: str,
    api_key_id: str | None,
    db: AsyncSession,
    redis_client,
) -> UsageStatsResponse:
    """Return a usage summary for the developer dashboard."""

    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)

    today_requests = 0
    today_limit = 0
    today_remaining = 0

    if api_key_id and redis_client is not None:
        payload = await redis_client.hgetall(f"usage:counter:{api_key_id}:{today.isoformat()}")
        today_requests = int(payload.get("request_count", 0))
        tier = await _get_key_tier(db, api_key_id)
        today_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["daily"] or 0
        today_remaining = max(0, today_limit - today_requests) if today_limit else 0
    else:
        today_stmt = select(
            func.coalesce(func.sum(UsageCounter.request_count), 0)
        ).where(
            UsageCounter.developer_id == UUID(developer_id),
            UsageCounter.date == today,
        )
        if api_key_id:
            today_stmt = today_stmt.where(UsageCounter.api_key_id == UUID(api_key_id))
        today_requests = int((await db.execute(today_stmt)).scalar_one() or 0)
        tier = await _get_developer_tier(db, UUID(developer_id))
        today_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["daily"] or 0
        today_remaining = max(0, today_limit - today_requests) if today_limit else 0

    count_stmt = select(
        func.coalesce(func.sum(UsageCounter.request_count), 0),
        func.coalesce(func.sum(UsageCounter.success_count), 0),
        func.coalesce(func.sum(UsageCounter.error_count), 0),
    ).where(
        UsageCounter.developer_id == UUID(developer_id),
        UsageCounter.date >= month_start,
    )
    if api_key_id:
        count_stmt = count_stmt.where(UsageCounter.api_key_id == UUID(api_key_id))
    month_requests, success_count, error_count = (await db.execute(count_stmt)).one()

    log_stmt = select(
        func.coalesce(func.avg(UsageLog.response_time_ms), 0),
        func.coalesce(func.sum(case((UsageLog.status_code < 400, 1), else_=0)), 0),
        func.count(UsageLog.id),
    ).where(
        UsageLog.developer_id == UUID(developer_id),
    )
    if api_key_id:
        log_stmt = log_stmt.where(UsageLog.api_key_id == UUID(api_key_id))
    avg_response_time_ms, success_logs, total_logs = (await db.execute(log_stmt)).one()
    total_logs = total_logs or 0
    success_rate = round((success_logs / total_logs) * 100, 2) if total_logs else 0.0

    tier = await _get_developer_tier(db, UUID(developer_id))
    month_limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["monthly"] or 0

    return UsageStatsResponse(
        today_requests=int(today_requests),
        today_limit=int(today_limit),
        today_remaining=int(today_remaining),
        month_requests=int(month_requests or 0),
        month_limit=int(month_limit),
        success_rate=success_rate,
        avg_response_time_ms=float(avg_response_time_ms or 0),
    )


# --- API PLATFORM ---
async def get_usage_history(
    developer_id: str,
    api_key_id: str | None,
    period_days: int,
    db: AsyncSession,
) -> UsageHistoryResponse:
    """Return a day-by-day usage breakdown."""

    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=period_days - 1)

    stmt = select(UsageCounter).where(
        UsageCounter.developer_id == UUID(developer_id),
        UsageCounter.date >= start_date,
        UsageCounter.date <= end_date,
    )
    if api_key_id:
        stmt = stmt.where(UsageCounter.api_key_id == UUID(api_key_id))
    result = await db.execute(stmt.order_by(UsageCounter.date.asc()))
    rows = result.scalars().all()
    by_date: dict[date, DailyUsagePoint] = {}
    for row in rows:
        existing = by_date.get(row.date)
        if existing is None:
            by_date[row.date] = DailyUsagePoint(
                date=row.date,
                request_count=row.request_count,
                success_count=row.success_count,
                error_count=row.error_count,
            )
        else:
            by_date[row.date] = DailyUsagePoint(
                date=row.date,
                request_count=existing.request_count + row.request_count,
                success_count=existing.success_count + row.success_count,
                error_count=existing.error_count + row.error_count,
            )

    data: list[DailyUsagePoint] = []
    current = start_date
    while current <= end_date:
        row = by_date.get(current)
        data.append(
            DailyUsagePoint(
                date=current,
                request_count=row.request_count if row else 0,
                success_count=row.success_count if row else 0,
                error_count=row.error_count if row else 0,
            )
        )
        current += timedelta(days=1)

    return UsageHistoryResponse(data=data, api_key_id=UUID(api_key_id) if api_key_id else None, period_days=period_days)


# --- API PLATFORM ---
async def get_top_endpoints(
    developer_id: str,
    period_days: int,
    db: AsyncSession,
) -> list[TopEndpointResponse]:
    """Return the most frequently used endpoints for a developer."""

    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    stmt = (
        select(
            UsageLog.endpoint,
            func.count(UsageLog.id).label("request_count"),
            func.coalesce(func.avg(UsageLog.response_time_ms), 0).label("avg_response_time_ms"),
            func.coalesce(
                func.avg(case((UsageLog.status_code >= 400, 1.0), else_=0.0)) * 100,
                0,
            ).label("error_rate"),
        )
        .where(UsageLog.developer_id == UUID(developer_id), UsageLog.created_at >= since)
        .group_by(UsageLog.endpoint)
        .order_by(func.count(UsageLog.id).desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    return [
        TopEndpointResponse(
            endpoint=row.endpoint,
            request_count=int(row.request_count or 0),
            avg_response_time_ms=float(row.avg_response_time_ms or 0),
            error_rate=float(row.error_rate or 0),
        )
        for row in result
    ]


# --- API PLATFORM ---
async def sync_all_counters_to_db() -> None:
    """Sync all usage counters using a self-managed v2 session."""

    from redis import asyncio as redis

    from app.core.config import get_settings
    from app.db.session_v2 import AsyncSessionLocalV2

    settings = get_settings()
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await sync_all_counters_to_db_with_client(AsyncSessionLocalV2, redis_client)
    finally:
        await redis_client.aclose()


# --- API PLATFORM ---
async def sync_all_counters_to_db_with_client(
    db_sessionmaker,
    redis_client,
) -> None:
    """Sync all usage counters using the provided session factory and Redis client."""

    await sync_all_counters_to_db_core(db_sessionmaker, redis_client)


# --- API PLATFORM ---
async def _get_key_tier(db: AsyncSession, api_key_id: str) -> str:
    """Lookup the tier for a key when Redis lacks context."""

    from app.models.developer_api_key import DeveloperApiKey

    result = await db.execute(select(DeveloperApiKey.tier).where(DeveloperApiKey.id == UUID(api_key_id)))
    tier = result.scalar_one_or_none()
    return tier.value if hasattr(tier, "value") else str(tier or "free")


# --- API PLATFORM ---
async def _get_developer_tier(db: AsyncSession, developer_id: UUID) -> str:
    """Fetch the developer tier for dashboard calculations."""

    from app.models.developer import Developer

    result = await db.execute(select(Developer.tier).where(Developer.id == developer_id))
    tier = result.scalar_one_or_none()
    return tier.value if hasattr(tier, "value") else str(tier or "free")


# --- API PLATFORM ---
async def _scan_usage_keys(redis_client):
    """Scan Redis keys matching usage:daily:*."""
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match="usage:daily:*", count=100)
        for key in keys:
            yield key if isinstance(key, str) else key.decode()
        if cursor == 0:
            break


# --- API PLATFORM ---
async def sync_all_counters_to_db_core(
    db_sessionmaker,
    redis_client,
) -> None:
    """Shared implementation for syncing Redis counters into PostgreSQL."""

    if redis_client is None:
        return

    async with db_sessionmaker() as db:
        async for key in _scan_usage_keys(redis_client):
            parts = key.split(":")
            if len(parts) < 4:
                continue
            api_key_id = parts[2]
            date_str = parts[3]
            payload = await redis_client.hgetall(key)
            if not payload:
                continue
            await sync_usage_to_db(
                api_key_id=api_key_id,
                developer_id=payload.get("developer_id", ""),
                date=date.fromisoformat(date_str),
                db=db,
                redis_client=redis_client,
            )


# --- API PLATFORM ---
async def generate_daily_summaries() -> None:
    """Generate a daily usage summary batch."""

    await sync_all_counters_to_db()
