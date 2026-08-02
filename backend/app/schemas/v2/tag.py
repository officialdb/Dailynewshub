"""Tag schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TagCreate(BaseModel):
    """Create a new tag."""

    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class TagResponse(BaseModel):
    """Serialized tag response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    created_at: datetime


class TagSummary(BaseModel):
    """Brief tag info embedded in article responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str


class ArticleTagsUpdate(BaseModel):
    """Replace all tags on an article."""

    tag_ids: list[UUID]
