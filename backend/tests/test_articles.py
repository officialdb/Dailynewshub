"""Tests for article schemas and slug utilities."""

from __future__ import annotations

import unittest
from datetime import datetime, timezone
from uuid import UUID

from app.schemas.article import ArticleResponse, PaginatedArticleResponse
from app.services.news_fetcher import slugify


class ArticleSchemaTests(unittest.TestCase):
    """Exercise article serialization helpers."""

    def test_slugify(self) -> None:
        """Slug generation should be lowercase and hyphenated."""

        self.assertEqual(slugify("Hello, World News"), "hello-world-news")

    def test_paginated_response_serialization(self) -> None:
        """Paginated article responses should serialize cleanly."""

        article = ArticleResponse(
            id=UUID("33333333-3333-3333-3333-333333333333"),
            title="Breaking News",
            description="Test",
            content="Body",
            image_url=None,
            source_name="Currents",
            source_url="https://example.com/story",
            author="Reporter",
            category_id=UUID("44444444-4444-4444-4444-444444444444"),
            is_featured=False,
            is_trending=True,
            view_count=12,
            published_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        payload = PaginatedArticleResponse(items=[article], total=1, page=1, limit=10, pages=1).model_dump(mode="json")
        self.assertEqual(payload["items"][0]["title"], "Breaking News")
        self.assertEqual(payload["total"], 1)

