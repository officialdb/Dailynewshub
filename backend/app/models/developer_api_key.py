"""Developer API keys used to authenticate external requests."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DeveloperKeyEnvironment, DeveloperTier

if TYPE_CHECKING:
    from app.models.developer import Developer
    from app.models.developer_app import DeveloperApp
    from app.models.usage_log import UsageLog


# --- API PLATFORM ---
class DeveloperApiKey(Base):
    """Hashed API key for a developer application."""

    __tablename__ = "developer_api_keys"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    developer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("developers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    app_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("developer_apps.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    environment: Mapped[DeveloperKeyEnvironment] = mapped_column(
        SAEnum(DeveloperKeyEnvironment, name="developer_key_environment", create_constraint=True),
        nullable=False,
        default=DeveloperKeyEnvironment.LIVE,
        server_default=DeveloperKeyEnvironment.LIVE.name,
    )
    tier: Mapped[DeveloperTier] = mapped_column(
        SAEnum(DeveloperTier, name="developer_tier", create_constraint=True),
        nullable=False,
        default=DeveloperTier.FREE,
        server_default=DeveloperTier.FREE.name,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    developer: Mapped[Developer] = relationship(back_populates="api_keys", lazy="selectin")
    app: Mapped[DeveloperApp] = relationship(back_populates="api_keys", lazy="selectin")
    usage_logs: Mapped[list[UsageLog]] = relationship(back_populates="api_key", lazy="selectin")
