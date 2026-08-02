"""Editorial notification routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies_v2 import get_db, get_current_user
from app.core.rbac import require_permission
from app.models.editorial_notification import EditorialNotification
from app.models.notification import Notification
from app.models.article import Article
from app.models.user import User
from app.schemas.v2.notification import NotificationMarkRead, NotificationResponse
from app.schemas.notification import SendNotificationRequest, ScheduleNotificationRequest
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications-v2"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


def _to_response(n: EditorialNotification) -> dict[str, Any]:
    return NotificationResponse(
        id=n.id,
        event_type=n.event_type,
        title=n.title,
        message=n.message,
        article_id=n.article_id,
        actor_name=n.actor.name if n.actor else None,
        is_read=n.is_read,
        created_at=n.created_at,
    ).model_dump(mode="json")


@router.get("")
async def list_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List notifications for the current user."""
    base = select(EditorialNotification).where(
        EditorialNotification.recipient_id == current_user.id,
    )
    count_base = select(func.count(EditorialNotification.id)).where(
        EditorialNotification.recipient_id == current_user.id,
    )

    if unread_only:
        base = base.where(EditorialNotification.is_read.is_(False))
        count_base = count_base.where(EditorialNotification.is_read.is_(False))

    total = int(await db.scalar(count_base) or 0)
    result = await db.execute(
        base.order_by(EditorialNotification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    notifications = [_to_response(n) for n in result.scalars().unique().all()]

    unread_count = int(await db.scalar(
        select(func.count(EditorialNotification.id)).where(
            EditorialNotification.recipient_id == current_user.id,
            EditorialNotification.is_read.is_(False),
        )
    ) or 0)

    return {
        "success": True,
        "message": "Notifications retrieved",
        "data": {
            **_paginate(notifications, total, page, limit),
            "unread_count": unread_count,
        },
    }


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get unread notification count."""
    count = int(await db.scalar(
        select(func.count(EditorialNotification.id)).where(
            EditorialNotification.recipient_id == current_user.id,
            EditorialNotification.is_read.is_(False),
        )
    ) or 0)

    return {"success": True, "message": "Unread count", "data": {"unread_count": count}}


@router.patch("/read")
async def mark_read(
    body: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Mark specific notifications as read, or all if no IDs provided."""
    stmt = update(EditorialNotification).where(
        EditorialNotification.recipient_id == current_user.id,
        EditorialNotification.is_read.is_(False),
    )

    if body.notification_ids:
        stmt = stmt.where(EditorialNotification.id.in_(body.notification_ids))

    await db.execute(stmt.values(is_read=True))
    await db.commit()

    return {"success": True, "message": "Notifications marked as read"}


@router.patch("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Mark all notifications as read."""
    await db.execute(
        update(EditorialNotification)
        .where(
            EditorialNotification.recipient_id == current_user.id,
            EditorialNotification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()

    return {"success": True, "message": "All notifications marked as read"}

# --- Admin Push Notifications ---

@router.post("/push/send")
async def send_push_notification(
    payload: SendNotificationRequest,
    _: User = Depends(require_permission("notification:send")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Send a push notification to all device tokens and store the event."""
    if payload.article_id is not None:
        article = await db.get(Article, payload.article_id)
        if article is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    from app.models.device_token import DeviceToken
    from app.services.push_notification import send_to_device

    token_query = select(DeviceToken)
    if payload.segment == "active":
        token_query = token_query.join(DeviceToken.user).where(User.is_active == True)
    elif payload.segment == "admins":
        token_query = token_query.join(DeviceToken.user).where(User.is_admin == True)

    token_result = await db.execute(token_query)
    device_tokens = token_result.scalars().all()
    total_tokens = len(device_tokens)

    sent_count = 0
    for dt in device_tokens:
        if await send_to_device(token=dt.fcm_token, title=payload.title, body=payload.body):
            sent_count += 1

    notification = Notification(
        title=payload.title,
        body=payload.body,
        article_id=payload.article_id,
        sent_at=datetime.now(timezone.utc),
        is_sent=True,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    try:
        from app.api.v1.endpoints.websocket import connection_manager
        await connection_manager.broadcast({
            "type": "notification",
            "notification_id": str(notification.id),
            "title": notification.title,
            "body": notification.body,
            "article_id": str(notification.article_id) if notification.article_id else None,
            "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
        })
    except Exception as e:
        logger.error(f"WebSocket broadcast failed: {e}")

    return {
        "success": True,
        "message": "Notification dispatched successfully",
        "data": {
            "notification_id": str(notification.id),
            "sent_count": sent_count,
            "total_tokens": total_tokens,
        },
    }

@router.post("/push/schedule", status_code=status.HTTP_201_CREATED)
async def schedule_push_notification(
    payload: ScheduleNotificationRequest,
    _: User = Depends(require_permission("notification:send")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Schedule a push notification for a future time."""
    if payload.article_id:
        article = await db.get(Article, payload.article_id)
        if not article:
            from fastapi import HTTPException
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
            
    notification = Notification(
        title=payload.title,
        body=payload.body,
        article_id=payload.article_id,
        scheduled_at=payload.scheduled_at,
        is_sent=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return {
        "success": True,
        "message": "Notification scheduled successfully",
        "data": {"notification_id": str(notification.id), "scheduled_at": notification.scheduled_at.isoformat()}
    }

@router.get("/push")
async def list_push_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    _: User = Depends(require_permission("notification:send")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List all push notifications with pagination."""
    total = int(await db.scalar(select(func.count(Notification.id))) or 0)
    result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    notifications = result.scalars().all()
    
    items = []
    for n in notifications:
        items.append({
            "id": str(n.id),
            "title": n.title,
            "body": n.body,
            "article_id": str(n.article_id) if n.article_id else None,
            "article_title": n.article.title if n.article else None,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "scheduled_at": n.scheduled_at.isoformat() if n.scheduled_at else None,
            "is_sent": n.is_sent,
            "created_at": n.created_at.isoformat(),
        })
        
    return {"success": True, "message": "Notifications retrieved successfully", "data": _paginate(items, total, page, limit)}

@router.delete("/push/{notification_id}")
async def delete_push_notification(
    notification_id: UUID,
    _: User = Depends(require_permission("notification:send")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete a push notification."""
    notification = await db.get(Notification, notification_id)
    if not notification:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        
    await db.delete(notification)
    await db.commit()
    return {"success": True, "message": "Notification deleted", "data": {"id": str(notification_id)}}
