"""Developer usage reporting schemas."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# --- API PLATFORM ---
class UsageStatsResponse(BaseModel):
    """High-level usage summary for a developer account."""

    today_requests: int
    today_limit: int
    today_remaining: int
    month_requests: int
    month_limit: int
    success_rate: float
    avg_response_time_ms: float


# --- API PLATFORM ---
class DailyUsagePoint(BaseModel):
    """Daily aggregate point for usage charts."""

    model_config = ConfigDict(from_attributes=True)

    date: date
    request_count: int
    success_count: int
    error_count: int


# --- API PLATFORM ---
class UsageHistoryResponse(BaseModel):
    """Historical usage series for a developer account."""

    data: list[DailyUsagePoint]
    api_key_id: UUID | None
    period_days: int


# --- API PLATFORM ---
class TopEndpointResponse(BaseModel):
    """Top-requested endpoint summary."""

    endpoint: str
    request_count: int
    avg_response_time_ms: float
    error_rate: float
