"""API key management routes for the v2 NMS API."""

from __future__ import annotations

import hashlib
import logging
import secrets
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_current_user, get_db
from app.core.rbac import require_permission
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.v2.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-keys", tags=["api-keys-v2"])


def _generate_key() -> tuple[str, str, str]:
    """Generate a new API key. Returns (raw_key, key_hash, prefix)."""
    raw_key = f"nms_{secrets.token_urlsafe(48)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:12]
    return raw_key, key_hash, prefix


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    request: Request,
    current_user: User = Depends(require_permission("apikey:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new API key. The plaintext key is returned only once."""
    raw_key, key_hash, prefix = _generate_key()

    api_key = ApiKey(
        key_hash=key_hash,
        name=body.name,
        prefix=prefix,
        owner_id=current_user.id,
        rate_limit=body.rate_limit,
        expires_at=body.expires_at,
    )
    db.add(api_key)

    await log_audit(
        db,
        action="apikey:create",
        resource_type="api_key",
        user_id=current_user.id,
        resource_id=api_key.id,
        changes={"name": body.name, "prefix": prefix},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(api_key)

    logger.info("API key created by %s: %s (%s)", current_user.email, body.name, prefix)

    created = ApiKeyCreated(
        id=api_key.id,
        key=raw_key,
        prefix=prefix,
        name=api_key.name,
        rate_limit=api_key.rate_limit,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
    )
    return {
        "success": True,
        "message": "API key created — save the key now, it won't be shown again",
        "data": created.model_dump(mode="json"),
    }


@router.get("")
async def list_api_keys(
    current_user: User = Depends(require_permission("apikey:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all API keys (masked — no plaintext)."""
    result = await db.execute(
        select(ApiKey).order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    data = [ApiKeyResponse.model_validate(k).model_dump(mode="json") for k in keys]

    return {"success": True, "message": "API keys retrieved", "data": data}


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("apikey:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Revoke (deactivate) an API key."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    api_key.is_active = False

    await log_audit(
        db,
        action="apikey:revoke",
        resource_type="api_key",
        user_id=current_user.id,
        resource_id=api_key.id,
        changes={"name": api_key.name, "prefix": api_key.prefix},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    return {"success": True, "message": "API key revoked"}


@router.post("/{key_id}/rotate")
async def rotate_api_key(
    key_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("apikey:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Rotate an API key — deactivate old, create new with same settings."""
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    old_key = result.scalar_one_or_none()
    if old_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    # Deactivate old key
    old_key.is_active = False

    # Create new key with same settings
    raw_key, key_hash, prefix = _generate_key()
    new_key = ApiKey(
        key_hash=key_hash,
        name=old_key.name,
        prefix=prefix,
        owner_id=old_key.owner_id,
        rate_limit=old_key.rate_limit,
        expires_at=old_key.expires_at,
    )
    db.add(new_key)

    await log_audit(
        db,
        action="apikey:rotate",
        resource_type="api_key",
        user_id=current_user.id,
        resource_id=old_key.id,
        changes={"old_prefix": old_key.prefix, "new_prefix": prefix},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(new_key)

    created = ApiKeyCreated(
        id=new_key.id,
        key=raw_key,
        prefix=prefix,
        name=new_key.name,
        rate_limit=new_key.rate_limit,
        expires_at=new_key.expires_at,
        created_at=new_key.created_at,
    )
    return {
        "success": True,
        "message": "API key rotated — save the new key now",
        "data": created.model_dump(mode="json"),
    }


# ─── Self-service: any authenticated user can manage their own keys ────────────


@router.get("/my")
async def list_my_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List the current user's own API keys (masked — no plaintext)."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.owner_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    data = [ApiKeyResponse.model_validate(k).model_dump(mode="json") for k in keys]
    return {"success": True, "message": "Your API keys retrieved", "data": data}


@router.post("/my", status_code=status.HTTP_201_CREATED)
async def create_my_api_key(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Self-service: provision an API key for the authenticated user.

    Any registered user can call this to get their first API key.
    The plaintext key is returned only once — it cannot be retrieved again.
    """
    # Limit: at most 5 active self-service keys per user
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.owner_id == current_user.id, ApiKey.is_active.is_(True))
    )
    existing_count = len(result.scalars().all())
    if existing_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have 5 active API keys. Revoke one before creating another.",
        )

    raw_key, key_hash, prefix = _generate_key()
    api_key = ApiKey(
        key_hash=key_hash,
        name=f"{current_user.name or current_user.email}'s Developer Key",
        prefix=prefix,
        owner_id=current_user.id,
        rate_limit=10000,  # 10k requests/month by default
    )
    db.add(api_key)

    await log_audit(
        db,
        action="apikey:self_provision",
        resource_type="api_key",
        user_id=current_user.id,
        resource_id=api_key.id,
        changes={"name": api_key.name, "prefix": prefix},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(api_key)

    logger.info("Self-service API key provisioned for %s: %s", current_user.email, prefix)

    created = ApiKeyCreated(
        id=api_key.id,
        key=raw_key,
        prefix=prefix,
        name=api_key.name,
        rate_limit=api_key.rate_limit,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
    )
    return {
        "success": True,
        "message": "API key created — save it now, it won't be shown again",
        "data": created.model_dump(mode="json"),
    }
