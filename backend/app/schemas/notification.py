"""Notification-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NotificationBase(BaseModel):
    """Shared notification fields."""

    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    article_id: UUID | None = None


class NotificationCreate(NotificationBase):
    """Payload for creating a notification."""


class NotificationResponse(NotificationBase):
    """Serialized notification response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sent_at: datetime | None
    created_at: datetime
    article_title: str | None = None


class SendNotificationRequest(NotificationBase):
    """Payload used by admin notification broadcast routes."""

# --- NEW ADDITION ---

class ScheduleNotificationRequest(NotificationBase):
    """Payload for scheduling a notification for the future."""
    scheduled_at: datetime

