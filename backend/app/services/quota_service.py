# --- SEC FIX SEC-012 ---
"""Per-user quota enforcement for expensive external API calls."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


QUOTAS = {
    "ai_summary": {"daily": 20, "description": "AI article summaries"},
    "tts_audio": {"daily": 5, "description": "text-to-speech conversions"},
}


async def check_and_increment_quota(
    user_id: str,
    action: str,
    redis_client: Any,
) -> tuple[bool, int, int]:
    """Atomically increment a user's daily quota counter if quota remains."""

    today = datetime.utcnow().strftime("%Y-%m-%d")
    redis_key = f"quota:{user_id}:{action}:{today}"
    daily_limit = QUOTAS[action]["daily"]

    current = await redis_client.incr(redis_key)

    if current == 1:
        now = datetime.utcnow()
        midnight = datetime(now.year, now.month, now.day) + timedelta(days=1)
        await redis_client.expireat(redis_key, int(midnight.timestamp()))

    if current > daily_limit:
        await redis_client.decr(redis_key)
        return False, current - 1, daily_limit

    return True, current, daily_limit
