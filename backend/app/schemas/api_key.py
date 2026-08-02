"""Developer API key schemas for the v2 API platform."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# --- API PLATFORM ---
class CreateAPIKeyRequest(BaseModel):
    """Request payload to create a new developer API key."""

    name: str = Field(min_length=1, max_length=100)
    environment: Literal["live", "test"] = "live"
    expires_at: datetime | None = None


# --- API PLATFORM ---
class APIKeyCreatedResponse(BaseModel):
    """One-time response shown only when an API key is created."""

    id: UUID
    name: str
    key_prefix: str
    raw_key: str
    environment: str
    tier: str
    created_at: datetime


# --- API PLATFORM ---
class APIKeyResponse(BaseModel):
    """Developer API key response returned after the one-time reveal."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    key_prefix: str
    environment: str
    tier: str
    is_active: bool
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime


# --- API PLATFORM ---
class RevokeAPIKeyResponse(BaseModel):
    """Response body for API key revocation."""

    id: UUID
    message: str = "API key revoked successfully"
