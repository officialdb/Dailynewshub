"""Developer API key generation, validation, rate limiting, and usage sync."""

from __future__ import annotations

import hashlib
import secrets
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.developer_api_key import DeveloperApiKey
from app.models.enums import DeveloperKeyEnvironment, DeveloperTier
from app.models.usage_counter import UsageCounter


TIER_LIMITS: dict[str, dict[str, int | None]] = {
    DeveloperTier.FREE.value: {"daily": 100, "monthly": 3_000},
    DeveloperTier.STARTER.value: {"daily": 1_000, "monthly": 30_000},
    DeveloperTier.PRO.value: {"daily": 10_000, "monthly": 300_000},
    DeveloperTier.ENTERPRISE.value: {"daily": None, "monthly": None},
}


# --- API PLATFORM ---
def _hash_key(raw_key: str) -> str:
    """Hash a raw developer API key for storage and lookup."""

    return hashlib.sha256(raw_key.encode()).hexdigest()


# --- API PLATFORM ---
def _redis_date_key(day: date) -> str:
    """Format a calendar day for Redis key usage."""

    return day.isoformat()


# --- API PLATFORM ---
def generate_api_key(environment: str = "live") -> tuple[str, str, str]:
    """Generate a new developer API key and its derived hashes."""

    token = secrets.token_hex(32)
    raw_key = f"dnh_{environment}_{token}"
    key_hash = _hash_key(raw_key)
    key_prefix = raw_key[:16]
    return raw_key, key_hash, key_prefix


# --- API PLATFORM ---
async def validate_api_key(
    raw_key: str,
    db: AsyncSession,
    redis_client,
) -> DeveloperApiKey | None:
    """Validate a developer API key against Redis and PostgreSQL."""

    key_hash = _hash_key(raw_key)
    cache_key = f"developer:api-key:{key_hash}"

    cached = await redis_client.get(cache_key) if redis_client is not None else None
    if cached:
        result = await db.execute(
            select(DeveloperApiKey)
            .options(selectinload(DeveloperApiKey.developer), selectinload(DeveloperApiKey.app))
            .where(DeveloperApiKey.key_hash == key_hash)
        )
        api_key = result.scalar_one_or_none()
        if api_key is not None and api_key.is_active:
            return api_key

    result = await db.execute(
        select(DeveloperApiKey)
        .options(selectinload(DeveloperApiKey.developer), selectinload(DeveloperApiKey.app))
        .where(DeveloperApiKey.key_hash == key_hash)
    )
    api_key = result.scalar_one_or_none()

    if api_key is None:
        return None
    if not api_key.is_active:
        return None
    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        api_key.is_active = False
        await db.commit()
        return None
    if api_key.developer is None or not api_key.developer.is_active:
        return None

    if redis_client is not None:
        await redis_client.setex(
            cache_key,
            300,
            api_key.id.hex,
        )

    api_key.last_used_at = datetime.now(timezone.utc)
    await db.commit()
    return api_key


# --- API PLATFORM ---
async def check_rate_limit(
    api_key: DeveloperApiKey,
    redis_client,
) -> tuple[bool, int, int]:
    """Check the daily rate limit for a developer key."""

    tier_limits = TIER_LIMITS.get(api_key.tier.value if hasattr(api_key.tier, "value") else str(api_key.tier), TIER_LIMITS[DeveloperTier.FREE.value])
    daily_limit = tier_limits["daily"]
    if daily_limit is None:
        return True, 0, -1
    if redis_client is None:
        return True, 0, int(daily_limit)

    today = datetime.now(timezone.utc).date()
    redis_key = f"rate:{api_key.id}:{_redis_date_key(today)}"
    current_count = int(await redis_client.incr(redis_key))
    if current_count == 1:
        midnight = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
        await redis_client.expire(redis_key, int((midnight - datetime.now(timezone.utc)).total_seconds()))

    allowed = current_count <= daily_limit
    return allowed, current_count, int(daily_limit)


# --- API PLATFORM ---
async def record_usage_counter(
    api_key: DeveloperApiKey,
    *,
    success: bool,
    response_time_ms: int,
    redis_client,
) -> None:
    """Increment the per-day usage counter hash in Redis."""

    today = datetime.now(timezone.utc).date()
    key = f"usage:counter:{api_key.id}:{_redis_date_key(today)}"
    if redis_client is None:
        return

    pipeline = redis_client.pipeline()
    pipeline.hsetnx(key, "api_key_id", str(api_key.id))
    pipeline.hsetnx(key, "developer_id", str(api_key.developer_id))
    pipeline.hincrby(key, "request_count", 1)
    pipeline.hincrby(key, "success_count" if success else "error_count", 1)
    pipeline.hincrby(key, "response_time_total_ms", response_time_ms)
    ttl = await redis_client.ttl(key)
    if ttl < 0:
        midnight = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
        pipeline.expire(key, int((midnight - datetime.now(timezone.utc)).total_seconds()))
    await pipeline.execute()


# --- API PLATFORM ---
async def sync_usage_to_db(
    api_key_id: str,
    developer_id: str,
    date: date,
    db: AsyncSession,
    redis_client,
) -> None:
    """Sync a single Redis usage hash into PostgreSQL."""

    key = f"usage:counter:{api_key_id}:{_redis_date_key(date)}"
    payload = await redis_client.hgetall(key) if redis_client is not None else {}
    if not payload:
        return

    request_count = int(payload.get("request_count", 0))
    success_count = int(payload.get("success_count", 0))
    error_count = int(payload.get("error_count", 0))

    stmt = insert(UsageCounter).values(
        api_key_id=UUID(api_key_id),
        developer_id=UUID(developer_id),
        date=date,
        request_count=request_count,
        success_count=success_count,
        error_count=error_count,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[UsageCounter.api_key_id, UsageCounter.date],
        set_={
            "request_count": stmt.excluded.request_count,
            "success_count": stmt.excluded.success_count,
            "error_count": stmt.excluded.error_count,
            "developer_id": stmt.excluded.developer_id,
        },
    )
    await db.execute(stmt)
    await db.commit()


# --- API PLATFORM ---
async def sync_all_counters_to_db(
    db_sessionmaker: async_sessionmaker[AsyncSession],
    redis_client,
) -> None:
    """Sync every Redis usage counter into PostgreSQL."""

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
async def _scan_usage_keys(redis_client):
    """Yield Redis usage-counter keys without blocking on a full key dump."""

    async for key in redis_client.scan_iter(match="usage:counter:*"):
        yield key


# --- API PLATFORM ---
async def _deactivate_expired_keys_db(db: AsyncSession) -> None:
    """Deactivate any developer API keys that have expired."""

    result = await db.execute(
        select(DeveloperApiKey).where(
            DeveloperApiKey.is_active.is_(True),
            DeveloperApiKey.expires_at.is_not(None),
            DeveloperApiKey.expires_at < datetime.now(timezone.utc),
        )
    )
    for api_key in result.scalars().all():
        api_key.is_active = False
    await db.commit()


# --- API PLATFORM ---
async def deactivate_expired_keys() -> None:
    """Scheduler wrapper that deactivates expired developer API keys."""

    from app.db.session_v2 import AsyncSessionLocalV2

    async with AsyncSessionLocalV2() as db:
        await _deactivate_expired_keys_db(db)


# --- API PLATFORM ---
def normalize_environment(environment: str) -> DeveloperKeyEnvironment:
    """Normalize a key environment string into the SQLAlchemy enum value."""

    return DeveloperKeyEnvironment(environment.lower())
