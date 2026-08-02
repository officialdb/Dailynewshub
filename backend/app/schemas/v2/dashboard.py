"""Dashboard/analytics schemas for the v2 NMS API."""

from __future__ import annotations

from pydantic import BaseModel


class StatusCount(BaseModel):
    """Article count for a single status."""

    status: str
    count: int


class DashboardStats(BaseModel):
    """High-level dashboard statistics."""

    total_articles: int
    total_users: int
    total_api_keys: int
    by_status: list[StatusCount]


class PipelineStage(BaseModel):
    """A single stage in the editorial pipeline."""

    status: str
    count: int
    label: str


class PipelineStats(BaseModel):
    """Editorial pipeline breakdown."""

    stages: list[PipelineStage]
    total_in_pipeline: int


class RecentActivity(BaseModel):
    """A single recent activity entry."""

    action: str
    resource_type: str
    user_name: str | None = None
    created_at: str


class MyAssignment(BaseModel):
    """An article assigned to the current user."""

    article_id: str
    title: str
    status: str
    category_name: str | None = None
    assigned_at: str | None = None
