"""Bookmark-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BookmarkBase(BaseModel):
    """Shared bookmark fields."""

    article_id: UUID


class BookmarkCreate(BookmarkBase):
    """Payload for creating a bookmark."""


class BookmarkResponse(BookmarkBase):
    """Serialized bookmark response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime

