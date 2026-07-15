"""User-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Shared fields for user payloads."""

    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    avatar_url: str | None = Field(default=None, max_length=500)


class UserCreate(UserBase):
    """Payload for registering a new user."""

    password: str = Field(min_length=8, max_length=255)


class UserUpdate(BaseModel):
    """Payload for updating a user profile."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, max_length=500)
    password: str | None = Field(default=None, min_length=8, max_length=255)
    is_active: bool | None = None
    is_admin: bool | None = None


class UserResponse(UserBase):
    """Serialized user response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    """Authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Request payload for refreshing a token pair."""

    refresh_token: str

# --- NEW ADDITION ---

class UserPreferencesUpdate(BaseModel):
    """Payload for updating user category preferences."""
    preferences: list[str]


class ReadingHistoryResponse(BaseModel):
    """Serialized reading history response."""
    article_ids: list[UUID]


