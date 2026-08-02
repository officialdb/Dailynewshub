"""System settings schemas for the v2 NMS API."""

from __future__ import annotations

from pydantic import BaseModel


class SystemSettings(BaseModel):
    """System-wide settings response."""

    app_name: str
    version: str
    max_upload_size_mb: int
    allowed_image_types: list[str]
    default_rate_limit: int
    workflow_states: list[str]
    system_roles: list[str]


class HealthStatus(BaseModel):
    """System health check response."""

    status: str
    database: str
    redis: str
    version: str
