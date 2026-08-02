"""Middleware enforcing developer API key auth on public v2 routes."""

from __future__ import annotations

import asyncio
import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.session_v2 import AsyncSessionLocalV2
from app.models.developer_api_key import DeveloperApiKey
from app.models.enums import DeveloperTier
from app.services.developer_api_key_service import check_rate_limit, record_usage_counter, validate_api_key
from app.services.usage_service import log_request


# --- API PLATFORM ---
def _error_payload(code: str, message: str, request_id: str) -> dict[str, object]:
    """Build the canonical developer API error envelope."""

    return {
        "error": {
            "code": code,
            "message": message,
            "docs_url": "https://developers.dailynewshub.com/docs/errors",
            "request_id": request_id,
        }
    }


# --- API PLATFORM ---
class APIKeyMiddleware(BaseHTTPMiddleware):
    """Validate developer API keys for the public v2 API."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id

        if not request.url.path.startswith("/api/v2/public"):
            response = await call_next(request)
            response.headers.setdefault("X-Request-ID", request_id)
            return response

        raw_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
        if not raw_key:
            return JSONResponse(
                status_code=401,
                content=_error_payload("MISSING_API_KEY", "Provide your API key in the X-API-Key header", request_id),
                headers={"X-Request-ID": request_id},
            )

        redis_client = getattr(request.app.state, "redis", None)
        async with AsyncSessionLocalV2() as db:
            api_key = await validate_api_key(raw_key, db, redis_client)

        if api_key is None:
            error_code = "INVALID_API_KEY"
            error_message = "The supplied API key is invalid"
            key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
            async with AsyncSessionLocalV2() as db:
                result = await db.execute(select(DeveloperApiKey).where(DeveloperApiKey.key_hash == key_hash))
                key_row = result.scalar_one_or_none()
                if key_row is not None:
                    if not key_row.is_active:
                        error_code = "REVOKED_API_KEY"
                        error_message = "The supplied API key has been revoked"
                    elif key_row.expires_at and key_row.expires_at < datetime.now(timezone.utc):
                        error_code = "EXPIRED_API_KEY"
                        error_message = "The supplied API key has expired"
            return JSONResponse(
                status_code=401,
                content=_error_payload(error_code, error_message, request_id),
                headers={"X-Request-ID": request_id},
            )

        tier = api_key.tier.value if hasattr(api_key.tier, "value") else str(api_key.tier)
        tier_limit_exempt = request.url.path == "/api/v2/public/categories"
        if not tier_limit_exempt:
            is_allowed, current_count, limit = await check_rate_limit(api_key, redis_client)
            if not is_allowed:
                reset_at = int(
                    datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=0).timestamp()
                )
                retry_after = max(0, reset_at - int(datetime.now(timezone.utc).timestamp()))
                return JSONResponse(
                    status_code=429,
                    content=_error_payload(
                        "RATE_LIMIT_EXCEEDED",
                        f"You have exceeded your daily limit of {limit} requests.",
                        request_id,
                    ),
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_at),
                        "Retry-After": str(retry_after),
                        "X-Request-ID": request_id,
                    },
                )
        else:
            current_count = 0
            limit = -1

        request.state.api_key = api_key
        request.state.api_key_id = str(api_key.id)
        request.state.developer_id = str(api_key.developer_id)
        request.state.tier = tier
        request.state.rate_limit = limit
        request.state.rate_limit_remaining = max(0, limit - current_count) if limit > 0 else -1
        request.state.rate_limit_reset = int(
            datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=0).timestamp()
        )
        request.state.request_started_at = datetime.now(timezone.utc)

        response = await call_next(request)

        response.headers["X-RateLimit-Limit"] = "unlimited" if limit == -1 else str(limit)
        response.headers["X-RateLimit-Remaining"] = (
            "unlimited" if request.state.rate_limit_remaining == -1 else str(request.state.rate_limit_remaining)
        )
        response.headers["X-RateLimit-Reset"] = str(request.state.rate_limit_reset)
        response.headers["X-Request-ID"] = request_id

        elapsed_ms = int((datetime.now(timezone.utc) - request.state.request_started_at).total_seconds() * 1000)
        if redis_client is not None:
            await record_usage_counter(
                api_key,
                success=response.status_code < 400,
                response_time_ms=elapsed_ms,
                redis_client=redis_client,
            )

        async def _background_log() -> None:
            async with AsyncSessionLocalV2() as db:
                await log_request(
                    api_key_id=str(api_key.id),
                    developer_id=str(api_key.developer_id),
                    endpoint=request.url.path,
                    method=request.method,
                    status_code=response.status_code,
                    response_time_ms=elapsed_ms,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    error_message=None if response.status_code < 400 else response.reason_phrase,
                    db=db,
                )

        asyncio.create_task(_background_log())
        return response
