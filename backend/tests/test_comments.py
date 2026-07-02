"""Tests for comment schemas."""

from __future__ import annotations

import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

from app.schemas.comment import CommentResponse


class CommentSchemaTests(unittest.TestCase):
    """Exercise comment response serialization."""

    def test_comment_response_serialization(self) -> None:
        """Comment responses should serialize user metadata cleanly."""

        dummy = SimpleNamespace(
            id=UUID("55555555-5555-5555-5555-555555555555"),
            article_id=UUID("66666666-6666-6666-6666-666666666666"),
            user_id=UUID("77777777-7777-7777-7777-777777777777"),
            body="Great read",
            user_name="Jane Reader",
            user_avatar_url="https://example.com/avatar.png",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        payload = CommentResponse.model_validate(dummy).model_dump(mode="json")
        self.assertEqual(payload["user_name"], "Jane Reader")
        self.assertEqual(payload["body"], "Great read")
