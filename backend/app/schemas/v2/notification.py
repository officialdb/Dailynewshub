"""Editorial notification schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """Serialized editorial notification."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    title: str
    message: str
    article_id: UUID | None = None
    actor_name: str | None = None
    is_read: bool
    created_at: datetime


class NotificationMarkRead(BaseModel):
    """Mark notifications as read."""

    notification_ids: list[UUID] | None = None
