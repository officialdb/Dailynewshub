"""Audit logging helper."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_audit(
    db: AsyncSession,
    action: str,
    resource_type: str,
    user_id: UUID | None = None,
    resource_id: UUID | None = None,
    changes: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    """Create an immutable audit log entry."""
    valid_user_id = None
    log_changes = dict(changes) if changes else {}
    if user_id is not None:
        from sqlalchemy import select
        from app.models.user import User
        res = await db.execute(select(User.id).where(User.id == user_id))
        if res.scalar_one_or_none() is not None:
            valid_user_id = user_id
        else:
            log_changes["actor_id"] = str(user_id)

    entry = AuditLog(
        user_id=valid_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        changes=log_changes if log_changes else None,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    await db.flush()
    return entry
