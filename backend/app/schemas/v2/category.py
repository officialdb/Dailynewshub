"""Category schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreateV2(BaseModel):
    """Create a new category."""

    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    icon: str | None = Field(default=None, max_length=120)


class CategoryUpdateV2(BaseModel):
    """Update a category."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    icon: str | None = Field(default=None, max_length=120)


class CategoryResponseV2(BaseModel):
    """Serialized category response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    icon: str | None = None
    created_at: datetime
    updated_at: datetime
