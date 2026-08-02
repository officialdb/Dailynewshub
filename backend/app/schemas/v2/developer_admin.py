from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import DeveloperTier


class DeveloperAdminResponse(BaseModel):
    """Admin-facing response schema for developers."""

    id: UUID
    name: str
    email: EmailStr
    company_name: str | None = None
    website: str | None = None
    what_are_you_building: str | None = None
    is_active: bool
    is_email_verified: bool
    tier: DeveloperTier
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeveloperStatusUpdate(BaseModel):
    """Schema for updating developer active status."""
    is_active: bool


class DeveloperAdminUpdate(BaseModel):
    """Schema for full admin update of a developer account."""
    name: str | None = None
    email: EmailStr | None = None
    company_name: str | None = None
    website: str | None = None
    what_are_you_building: str | None = None
    tier: DeveloperTier | None = None
    is_active: bool | None = None
    is_email_verified: bool | None = None
