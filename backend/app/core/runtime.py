"""Runtime validation helpers for external services."""

from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.db.session import engine


async def check_database() -> dict[str, Any]:
    """Validate that PostgreSQL is reachable."""

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - runtime integration guard
        return {"status": "unavailable", "error": str(exc)}


async def check_redis(redis_client: Any) -> dict[str, Any]:
    """Validate that Redis is reachable through the configured client."""

    if redis_client is None:
        return {"status": "unavailable", "error": "Redis client is not initialized"}

    try:
        await redis_client.ping()
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - runtime integration guard
        return {"status": "unavailable", "error": str(exc)}


async def collect_runtime_status(redis_client: Any) -> dict[str, Any]:
    """Collect a combined status payload for core runtime dependencies."""

    database = await check_database()
    redis = await check_redis(redis_client)
    return {
        "database": database,
        "redis": redis,
        "overall": "ok" if database["status"] == "ok" and redis["status"] == "ok" else "degraded",
    }
