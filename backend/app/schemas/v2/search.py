"""Search schemas for the v2 NMS API."""

from __future__ import annotations

from pydantic import BaseModel


class SearchResult(BaseModel):
    """A single search result with relevance info."""

    id: str
    title: str
    description: str | None = None
    status: str
    category_name: str | None = None
    reporter_name: str | None = None
    published_at: str | None = None
    created_at: str


class SearchResponse(BaseModel):
    """Paginated search results."""

    items: list[SearchResult]
    total: int
    page: int
    limit: int
    pages: int
    query: str
