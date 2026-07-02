"""Article-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ArticleBase(BaseModel):
    """Shared article fields."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    content: str | None = None
    image_url: str | None = Field(default=None, max_length=1000)
    source_name: str | None = Field(default=None, max_length=255)
    source_url: str = Field(min_length=1, max_length=1000)
    author: str | None = Field(default=None, max_length=255)
    category_id: UUID
    is_featured: bool = False
    is_trending: bool = False
    view_count: int = 0
    published_at: datetime | None = None


class ArticleCreate(ArticleBase):
    """Payload for creating an article."""


class ArticleUpdate(BaseModel):
    """Payload for updating an article."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    content: str | None = None
    image_url: str | None = Field(default=None, max_length=1000)
    source_name: str | None = Field(default=None, max_length=255)
    source_url: str | None = Field(default=None, max_length=1000)
    author: str | None = Field(default=None, max_length=255)
    category_id: UUID | None = None
    is_featured: bool | None = None
    is_trending: bool | None = None
    view_count: int | None = None
    published_at: datetime | None = None


class ArticleResponse(ArticleBase):
    """Serialized article response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class PaginatedArticleResponse(BaseModel):
    """Paginated article response envelope."""

    items: list[ArticleResponse]
    total: int
    page: int
    limit: int
    pages: int

