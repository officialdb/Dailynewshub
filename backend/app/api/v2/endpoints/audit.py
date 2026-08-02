"""Advanced audit log routes for the v2 NMS API."""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.v2.audit import AuditLogResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["audit-v2"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


def _to_response(entry: AuditLog) -> dict[str, Any]:
    return AuditLogResponse(
        id=entry.id,
        user_id=entry.user_id,
        user_name=entry.user.name if entry.user else None,
        action=entry.action,
        resource_type=entry.resource_type,
        resource_id=entry.resource_id,
        changes=entry.changes,
        ip_address=entry.ip_address,
        user_agent=entry.user_agent,
        created_at=entry.created_at,
    ).model_dump(mode="json")


@router.get("")
async def list_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    action: str | None = Query(default=None, max_length=100),
    resource_type: str | None = Query(default=None, max_length=100),
    user_id: UUID | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    current_user: User = Depends(require_permission("audit:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List audit logs with filtering and pagination."""
    base_query = select(AuditLog).options(selectinload(AuditLog.user))
    count_query = select(func.count(AuditLog.id))

    if action:
        base_query = base_query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)
    if resource_type:
        base_query = base_query.where(AuditLog.resource_type == resource_type)
        count_query = count_query.where(AuditLog.resource_type == resource_type)
    if user_id:
        base_query = base_query.where(AuditLog.user_id == user_id)
        count_query = count_query.where(AuditLog.user_id == user_id)
    if from_date:
        base_query = base_query.where(AuditLog.created_at >= from_date)
        count_query = count_query.where(AuditLog.created_at >= from_date)
    if to_date:
        base_query = base_query.where(AuditLog.created_at <= to_date)
        count_query = count_query.where(AuditLog.created_at <= to_date)

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(
        base_query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    entries = [_to_response(e) for e in result.scalars().unique().all()]

    return {"success": True, "message": "Audit logs retrieved", "data": _paginate(entries, total, page, limit)}


@router.get("/actions")
async def list_actions(
    current_user: User = Depends(require_permission("audit:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all distinct action types for filter dropdowns."""
    result = await db.execute(
        select(AuditLog.action).distinct().order_by(AuditLog.action)
    )
    actions = [row[0] for row in result.all()]
    return {"success": True, "message": "Actions retrieved", "data": actions}


@router.get("/export")
async def export_audit_logs(
    action: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    current_user: User = Depends(require_permission("audit:export")),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Export audit logs as CSV."""
    query = select(AuditLog).options(selectinload(AuditLog.user))

    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if from_date:
        query = query.where(AuditLog.created_at >= from_date)
    if to_date:
        query = query.where(AuditLog.created_at <= to_date)

    query = query.order_by(AuditLog.created_at.desc()).limit(10000)

    result = await db.execute(query)
    entries = result.scalars().unique().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "user_name", "action", "resource_type", "resource_id", "ip_address", "created_at"])

    for e in entries:
        writer.writerow([
            str(e.id),
            e.user.name if e.user else "",
            e.action,
            e.resource_type,
            str(e.resource_id) if e.resource_id else "",
            e.ip_address or "",
            e.created_at.isoformat(),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )
