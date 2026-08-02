"""User schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserResponse(BaseModel):
    """Serialized user response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr
    avatar_url: str | None = None
    country: str | None = None
    state: str | None = None
    phone_number: str | None = None
    is_active: bool
    is_admin: bool
    roles: list[RoleSummary] = []
    created_at: datetime
    updated_at: datetime


class RoleSummary(BaseModel):
    """Brief role info embedded in user responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class UserCreate(BaseModel):
    """Admin creates a user."""

    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)
    is_active: bool = True
    is_admin: bool = False
    role_ids: list[UUID] = []


class UserUpdate(BaseModel):
    """Admin updates a user."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=255)
    is_active: bool | None = None
    is_admin: bool | None = None


class AssignRolesRequest(BaseModel):
    """Assign roles to a user (replaces existing roles)."""

    role_ids: list[UUID]


class ChangeStatusRequest(BaseModel):
    """Activate or deactivate a user."""

    is_active: bool


# Rebuild forward references
UserResponse.model_rebuild()
