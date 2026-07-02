"""Comment-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CommentBase(BaseModel):
    """Shared comment fields."""

    body: str = Field(min_length=1, max_length=2000)


class CommentCreate(CommentBase):
    """Payload for creating a comment."""


class CommentResponse(CommentBase):
    """Serialized comment response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    article_id: UUID
    user_id: UUID
    user_name: str
    user_avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime
