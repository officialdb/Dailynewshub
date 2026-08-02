"""API key schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    """Create a new API key."""

    name: str = Field(min_length=1, max_length=255)
    rate_limit: int = Field(default=1000, ge=1, le=100000)
    expires_at: datetime | None = None


class ApiKeyCreated(BaseModel):
    """Response returned only on creation — contains the plaintext key."""

    id: UUID
    key: str
    prefix: str
    name: str
    rate_limit: int
    expires_at: datetime | None = None
    created_at: datetime


class ApiKeyResponse(BaseModel):
    """Masked API key response (no plaintext)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    prefix: str
    name: str
    rate_limit: int
    is_active: bool
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime
