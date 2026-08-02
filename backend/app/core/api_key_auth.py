"""API key authentication dependency for the public v2 API."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies_v2 import get_db
from app.models.developer_api_key import DeveloperApiKey


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


# --- API PLATFORM ---
async def _lookup_api_key(db: AsyncSession, key_hash: str) -> DeveloperApiKey | None:
    """Look up a developer API key and load its owning records."""

    result = await db.execute(select(DeveloperApiKey).where(DeveloperApiKey.key_hash == key_hash))
    return result.scalar_one_or_none()


async def get_api_key_consumer(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> DeveloperApiKey:
    """Resolve the API consumer from the ``X-API-Key`` header."""

    cached_key = getattr(request.state, "api_key", None)
    if cached_key is not None:
        return cached_key

    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-API-Key header")

    key_hash = _hash_key(x_api_key)
    api_key = await _lookup_api_key(db, key_hash)

    if api_key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    if not api_key.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="API key has been revoked")

    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="API key has expired")

    api_key.last_used_at = datetime.now(timezone.utc)
    await db.flush()

    request.state.api_key = api_key
    request.state.api_key_id = str(api_key.id)
    request.state.developer_id = str(api_key.developer_id)
    request.state.tier = api_key.tier.value if hasattr(api_key.tier, "value") else str(api_key.tier)
    return api_key
