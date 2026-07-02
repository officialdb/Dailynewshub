"""Category-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    """Shared category fields."""

    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    icon: str | None = Field(default=None, max_length=120)


class CategoryCreate(CategoryBase):
    """Payload for creating a category."""


class CategoryUpdate(BaseModel):
    """Payload for updating a category."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    icon: str | None = Field(default=None, max_length=120)


class CategoryResponse(CategoryBase):
    """Serialized category response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

