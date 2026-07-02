"""Redis-backed cache helpers for Daily News Hub."""

from __future__ import annotations

import json
import re
from typing import Any

from fastapi import Request


CACHE_PREFIX = "cache"
VERSION_PREFIX = "cache:version"


def get_redis_client(request: Request) -> Any | None:
    """Return the active Redis client attached to the current app state."""

    return getattr(request.app.state, "redis", None)


def normalize_cache_fragment(value: str) -> str:
    """Normalize a string for safe use in cache keys."""

    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return normalized.strip("-") or "all"


async def get_json(redis_client: Any | None, key: str) -> Any | None:
    """Read and decode a JSON cache entry."""

    if redis_client is None:
        return None

    raw_value = await redis_client.get(key)
    if raw_value is None:
        return None

    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return None


async def set_json(redis_client: Any | None, key: str, value: Any, ttl_seconds: int) -> None:
    """Store a JSON-serializable value in Redis with a TTL."""

    if redis_client is None:
        return

    await redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))


async def delete_keys(redis_client: Any | None, *keys: str) -> None:
    """Delete one or more Redis keys if a client is available."""

    if redis_client is None or not keys:
        return

    await redis_client.delete(*keys)


async def get_version(redis_client: Any | None, group: str) -> int:
    """Read the current cache version for a logical cache group."""

    if redis_client is None:
        return 0

    version = await redis_client.get(f"{VERSION_PREFIX}:{group}")
    return int(version or 0)


async def bump_version(redis_client: Any | None, group: str) -> int:
    """Increment the cache version for a logical cache group."""

    if redis_client is None:
        return 0

    return int(await redis_client.incr(f"{VERSION_PREFIX}:{group}"))


async def build_versioned_key(redis_client: Any | None, group: str, *parts: str) -> str:
    """Build a cache key scoped to a versioned logical group."""

    version = await get_version(redis_client, group)
    suffix = ":".join(parts) if parts else "all"
    return f"{CACHE_PREFIX}:{group}:v{version}:{suffix}"
