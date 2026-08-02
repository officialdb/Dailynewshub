"""Developer account schemas for the v2 API platform."""

from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# --- API PLATFORM ---
class DeveloperRegisterRequest(BaseModel):
    """Payload for developer registration."""

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=500)
    what_are_you_building: str | None = Field(default=None, max_length=5000)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        """Enforce the minimum password complexity required by the platform."""

        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", value):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must contain at least one special character")
        return value


# --- API PLATFORM ---
class DeveloperLoginRequest(BaseModel):
    """Login payload for developers."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


# --- API PLATFORM ---
class DeveloperProfileUpdateRequest(BaseModel):
    """Editable developer profile fields."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    company_name: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=500)
    what_are_you_building: str | None = Field(default=None, max_length=5000)


# --- API PLATFORM ---
class DeveloperResponse(BaseModel):
    """Serialized developer account response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    company_name: str | None = None
    website: str | None = None
    tier: str
    is_active: bool
    is_email_verified: bool
    created_at: datetime


# --- API PLATFORM ---
class DeveloperTokenResponse(BaseModel):
    """Token pair returned after developer login or refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    developer: DeveloperResponse


# --- API PLATFORM ---
class DeveloperRefreshTokenRequest(BaseModel):
    """Refresh-token payload."""

    refresh_token: str
