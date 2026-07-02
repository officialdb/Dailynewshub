"""Tests for notification schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID

import unittest

from app.schemas.notification import NotificationResponse


class NotificationSchemaTests(unittest.TestCase):
    """Exercise the notification response model."""

    def test_notification_response_supports_article_title(self) -> None:
        """Notification responses should serialize article titles when present."""

        notification = SimpleNamespace(
            id=UUID("33333333-3333-3333-3333-333333333333"),
            title="New articles available",
            body="3 new articles were added to Daily News Hub.",
            article_id=None,
            sent_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            article_title="Daily News Hub",
        )

        payload = NotificationResponse.model_validate(notification).model_dump(mode="json")

        self.assertEqual(payload["title"], "New articles available")
        self.assertEqual(payload["article_title"], "Daily News Hub")
