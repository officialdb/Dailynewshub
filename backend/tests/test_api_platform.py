"""Tests for the developer API platform helpers."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
import unittest

from pydantic import ValidationError

from app.core.api_key_auth import _hash_key
from app.core.email_registry import email_in_use
from app.middleware.api_key_middleware import _error_payload
from app.models.enums import DeveloperTier
from app.schemas.developer import DeveloperRegisterRequest
from app.services.developer_api_key_service import check_rate_limit, generate_api_key, validate_api_key
from app.services.usage_service import get_top_endpoints, get_usage_history


# --- API PLATFORM ---
class FakeRedis:
    """Minimal Redis double for key and counter tests."""

    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.counts: defaultdict[str, int] = defaultdict(int)
        self.expires: dict[str, int] = {}
        self.hashes: dict[str, dict[str, str]] = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self.values[key] = value
        self.expires[key] = ttl

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.values[key] = value
        if ex is not None:
            self.expires[key] = ex

    async def incr(self, key: str) -> int:
        self.counts[key] += 1
        return self.counts[key]

    async def expire(self, key: str, ttl: int) -> None:
        self.expires[key] = ttl

    async def ttl(self, key: str) -> int:
        return self.expires.get(key, -1)

    async def hgetall(self, key: str) -> dict[str, str]:
        return self.hashes.get(key, {})


# --- API PLATFORM ---
class FakeResult:
    """Tiny SQLAlchemy result shim."""

    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value

    def scalar(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        return list(self._value)

    def __iter__(self):
        return iter(self._value)

    def one(self):
        return self._value


# --- API PLATFORM ---
class FakeDb:
    """Database double that returns queued results."""

    def __init__(self, results: list[object]) -> None:
        self.results = results
        self.commits = 0
        self.executed: list[object] = []

    async def execute(self, statement):
        self.executed.append(statement)
        if not self.results:
            return FakeResult(None)
        return FakeResult(self.results.pop(0))

    async def scalar(self, statement):
        self.executed.append(statement)
        if not self.results:
            return None
        return self.results.pop(0)

    async def commit(self) -> None:
        self.commits += 1


# --- API PLATFORM ---
@dataclass
class UsageRow:
    """Simple usage counter row for aggregation tests."""

    date: date
    request_count: int
    success_count: int
    error_count: int


# --- API PLATFORM ---
@dataclass
class EndpointRow:
    """Simple endpoint aggregate row for reporting tests."""

    endpoint: str
    request_count: int
    avg_response_time_ms: float
    error_rate: float


# --- API PLATFORM ---
class DeveloperPlatformTests(unittest.IsolatedAsyncioTestCase):
    """Exercise the developer platform helper functions."""

    def test_register_request_enforces_password_complexity(self) -> None:
        """Weak passwords should fail schema validation."""

        with self.assertRaises(ValidationError):
            DeveloperRegisterRequest(
                name="Acme Dev",
                email="dev@example.com",
                password="lowercase1!",
            )

    def test_generate_api_key_shape(self) -> None:
        """Generated keys should follow the expected hash and prefix conventions."""

        raw_key, key_hash, key_prefix = generate_api_key("live")
        self.assertTrue(raw_key.startswith("dnh_live_"))
        self.assertEqual(len(key_hash), 64)
        self.assertEqual(key_prefix, raw_key[:16])

    async def test_check_rate_limit_enforces_daily_cap(self) -> None:
        """Rate limiting should increment counters and preserve the configured cap."""

        redis = FakeRedis()
        api_key = SimpleNamespace(id=uuid4(), tier=DeveloperTier.FREE, developer_id=uuid4())

        first_allowed, first_count, first_limit = await check_rate_limit(api_key, redis)
        second_allowed, second_count, _ = await check_rate_limit(api_key, redis)

        self.assertTrue(first_allowed)
        self.assertEqual(first_count, 1)
        self.assertEqual(first_limit, 100)
        self.assertTrue(second_allowed)
        self.assertEqual(second_count, 2)

    async def test_validate_api_key_returns_key_and_caches(self) -> None:
        """Valid keys should resolve and be cached."""

        developer = SimpleNamespace(id=uuid4(), is_active=True)
        api_key = SimpleNamespace(
            id=uuid4(),
            developer_id=developer.id,
            is_active=True,
            expires_at=None,
            developer=developer,
            app=SimpleNamespace(),
            tier=DeveloperTier.PRO,
            last_used_at=None,
            key_hash=_hash_key("dnh_live_abcdef"),
        )
        db = FakeDb([api_key])
        redis = FakeRedis()

        resolved = await validate_api_key("dnh_live_abcdef", db, redis)

        self.assertIs(resolved, api_key)
        self.assertEqual(db.commits, 1)
        self.assertEqual(redis.values[f"developer:api-key:{api_key.key_hash}"], api_key.id.hex)

    async def test_email_registry_blocks_cross_type_duplicates(self) -> None:
        """An email used by either account type should block reuse."""

        user_email_db = FakeDb([object()])
        developer_email_db = FakeDb([None, object()])

        self.assertTrue(await email_in_use(user_email_db, "Dev@Example.com"))
        self.assertTrue(await email_in_use(developer_email_db, "User@Example.com"))

    async def test_email_registry_allows_unused_email(self) -> None:
        """Unused emails should remain available for either account type."""

        db = FakeDb([None, None])

        self.assertFalse(await email_in_use(db, "new@example.com"))

    async def test_usage_history_fills_missing_days(self) -> None:
        """Usage history should include zero-filled days for missing dates."""

        today = datetime.now(timezone.utc).date()
        rows = [
            UsageRow(date=today - timedelta(days=2), request_count=2, success_count=2, error_count=0),
            UsageRow(date=today, request_count=5, success_count=4, error_count=1),
        ]
        db = FakeDb([rows])

        history = await get_usage_history(str(uuid4()), None, 3, db)

        self.assertEqual(history.period_days, 3)
        self.assertEqual(len(history.data), 3)
        self.assertEqual(history.data[0].request_count, 2)
        self.assertEqual(history.data[1].request_count, 0)
        self.assertEqual(history.data[2].request_count, 5)

    async def test_top_endpoints_serializes_rows(self) -> None:
        """Top endpoint reporting should preserve the aggregate values."""

        rows = [
            EndpointRow(endpoint="/api/v2/public/articles", request_count=12, avg_response_time_ms=42.5, error_rate=8.3),
        ]
        db = FakeDb([rows])

        endpoints = await get_top_endpoints(str(uuid4()), 30, db)

        self.assertEqual(len(endpoints), 1)
        self.assertEqual(endpoints[0].endpoint, "/api/v2/public/articles")
        self.assertEqual(endpoints[0].request_count, 12)

    def test_error_payload_includes_request_id(self) -> None:
        """Developer error envelopes should always include request ids."""

        payload = _error_payload("INVALID_API_KEY", "bad key", "req-123")
        self.assertEqual(payload["error"]["code"], "INVALID_API_KEY")
        self.assertEqual(payload["error"]["request_id"], "req-123")
