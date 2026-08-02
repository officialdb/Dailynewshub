"""Audit log schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    """Serialized audit log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None = None
    user_name: str | None = None
    action: str
    resource_type: str
    resource_id: UUID | None = None
    changes: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
