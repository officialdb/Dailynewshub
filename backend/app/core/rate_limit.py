"""Redis-backed request rate limiting helpers."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, status


def _client_identity(request: Request) -> str:
    """Derive a stable client identity from the request."""

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or "unknown"

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


async def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
    identity: str | None = None,
) -> None:
    """Apply a fixed-window rate limit using Redis counters."""

    redis_client: Any | None = getattr(request.app.state, "redis", None)
    if redis_client is None:
        return

    client_id = identity or _client_identity(request)
    key = f"rate-limit:{scope}:{client_id}"
    current = int(await redis_client.incr(key))
    if current == 1:
        await redis_client.expire(key, window_seconds)
    else:
        ttl = await redis_client.ttl(key)
        if ttl < 0:
            await redis_client.expire(key, window_seconds)

    if current > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for {scope}. Try again later.",
        )
