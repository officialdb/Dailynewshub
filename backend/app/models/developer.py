"""Developer account model for the v2 API platform."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DeveloperTier

if TYPE_CHECKING:
    from app.models.developer_app import DeveloperApp
    from app.models.developer_api_key import DeveloperApiKey
    from app.models.usage_log import UsageLog


# --- API PLATFORM ---
class Developer(Base):
    """External developer account, separate from internal user accounts."""

    __tablename__ = "developers"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    what_are_you_building: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    is_email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    email_verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    email_verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tier: Mapped[DeveloperTier] = mapped_column(
        SAEnum(DeveloperTier, name="developer_tier", create_constraint=True),
        nullable=False,
        default=DeveloperTier.FREE,
        server_default=DeveloperTier.FREE.name,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    apps: Mapped[list[DeveloperApp]] = relationship(
        back_populates="developer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    api_keys: Mapped[list[DeveloperApiKey]] = relationship(
        back_populates="developer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    usage_logs: Mapped[list[UsageLog]] = relationship(
        back_populates="developer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
