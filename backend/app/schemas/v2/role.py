"""Role & permission schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PermissionResponse(BaseModel):
    """Serialized permission."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    resource: str
    action: str
    description: str | None = None
    created_at: datetime


class RoleResponse(BaseModel):
    """Serialized role with permissions."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    is_system: bool
    permissions: list[PermissionResponse] = []
    created_at: datetime
    updated_at: datetime


class RoleCreate(BaseModel):
    """Create a new role."""

    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class RoleUpdate(BaseModel):
    """Update a role."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class AssignPermissionsRequest(BaseModel):
    """Assign permissions to a role (replaces existing)."""

    permission_ids: list[UUID]
