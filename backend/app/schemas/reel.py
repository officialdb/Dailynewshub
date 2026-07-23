"""Reel-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReelBase(BaseModel):
    """Shared reel fields."""

    youtube_video_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    thumbnail_url: str | None = Field(default=None, max_length=1000)
    channel_id: str = Field(min_length=1, max_length=255)
    channel_name: str = Field(min_length=1, max_length=255)
    channel_logo_url: str | None = Field(default=None, max_length=1000)
    category_id: UUID | None = None
    duration_seconds: int = 0
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    # --- BUG FIX ---
    aspect_ratio: str = "16:9"
    published_at: datetime | None = None


class ReelResponse(ReelBase):
    """Serialized reel response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    is_liked: bool = False
    is_bookmarked: bool = False


class PaginatedReelResponse(BaseModel):
    """Paginated reel response envelope."""

    items: list[ReelResponse]
    total: int
    page: int
    limit: int
    pages: int
