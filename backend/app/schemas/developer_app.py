"""Developer app schemas for the v2 API platform."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.api_key import APIKeyResponse


# --- API PLATFORM ---
class CreateAppRequest(BaseModel):
    """Create a new developer app."""

    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=5000)


# --- API PLATFORM ---
class UpdateAppRequest(BaseModel):
    """Update a developer app."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=5000)


# --- API PLATFORM ---
class AppResponse(BaseModel):
    """Serialized developer app including its API keys."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    is_active: bool
    api_keys: list[APIKeyResponse] = Field(default_factory=list)
    created_at: datetime
