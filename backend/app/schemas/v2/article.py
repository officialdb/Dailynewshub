"""Article schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ArticleStatus


class ArticleCreateV2(BaseModel):
    """Reporter creates a new article."""

    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    content: str | None = None
    image_url: str | None = Field(default=None, max_length=1000)
    source_name: str | None = Field(default=None, max_length=255)
    source_url: str | None = Field(default=None, max_length=1000)
    author: str | None = Field(default=None, max_length=255)
    category_id: UUID
    location: str | None = Field(default=None, max_length=255)
    location_state: str | None = Field(default=None, max_length=255)
    location_country: str | None = Field(default=None, max_length=255)

    # --- FIX 3: SEO & SLUG FIELDS ---
    slug: str | None = Field(default=None, max_length=300)
    seo_title: str | None = Field(default=None, max_length=70)
    meta_description: str | None = Field(default=None, max_length=160)
    canonical_url: str | None = Field(default=None, max_length=500)
    image_alt_text: str | None = Field(default=None, max_length=300)


class ArticleUpdateV2(BaseModel):
    """Update an article (own or any, depending on role)."""

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
    is_pinned: bool | None = None
    location: str | None = Field(default=None, max_length=255)
    location_state: str | None = Field(default=None, max_length=255)
    location_country: str | None = Field(default=None, max_length=255)

    # --- FIX 3: SEO & SLUG FIELDS ---
    slug: str | None = Field(default=None, max_length=300)
    seo_title: str | None = Field(default=None, max_length=70)
    meta_description: str | None = Field(default=None, max_length=160)
    canonical_url: str | None = Field(default=None, max_length=500)
    image_alt_text: str | None = Field(default=None, max_length=300)


# --- FIX 6: SOFT DELETE ---
class DeleteArticleRequest(BaseModel):
    """Reason for soft deletion."""
    reason: str | None = None

class ReporterSummary(BaseModel):
    """Brief reporter info embedded in article responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str


class CategorySummary(BaseModel):
    """Brief category info embedded in article responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str


class WorkflowSummary(BaseModel):
    """Brief workflow state embedded in article responses."""

    model_config = ConfigDict(from_attributes=True)

    status: ArticleStatus
    assigned_to_id: UUID | None = None
    submitted_at: datetime | None = None
    published_at: datetime | None = None


class ArticleResponseV2(BaseModel):
    """Full article response for the NMS."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    content: str | None = None
    image_url: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    author: str | None = None
    category_id: UUID
    is_featured: bool
    is_trending: bool
    is_pinned: bool
    view_count: int
    status: ArticleStatus
    location: str | None = None
    location_state: str | None = None
    location_country: str | None = None
    reporter_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None

    # --- FIX 2: POST-PUBLISH EDITING & CORRECTIONS ---
    correction_notice: str | None = None
    correction_added_at: datetime | None = None
    is_breaking_update: bool = False
    post_publish_edit_count: int = 0

    # --- FIX 3: SEO & SLUG FIELDS ---
    slug: str | None = None
    seo_title: str | None = None
    meta_description: str | None = None
    canonical_url: str | None = None
    image_alt_text: str | None = None

    reporter: ReporterSummary | None = None
    category: CategorySummary | None = None
    workflow: WorkflowSummary | None = None

# --- FIX 2: POST-PUBLISH EDITING & CORRECTIONS ---
class CorrectionNoticeRequest(BaseModel):
    """Add a correction notice to a published article."""
    notice: str = Field(min_length=10)


class ArticleListFilters(BaseModel):
    """Query filters for listing articles."""

    status: ArticleStatus | None = None
    category_id: UUID | None = None
    reporter_id: UUID | None = None
    search: str | None = None
