"""Per-request usage log records for developer API traffic."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.developer import Developer
    from app.models.developer_api_key import DeveloperApiKey


# --- API PLATFORM ---
class UsageLog(Base):
    """Immutable log entry for a single developer API request."""

    __tablename__ = "usage_logs"
    __table_args__ = (
        Index("ix_usage_logs_api_key_created_at", "api_key_id", "created_at"),
        Index("ix_usage_logs_developer_created_at", "developer_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    api_key_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("developer_api_keys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    developer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("developers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    api_key: Mapped[DeveloperApiKey] = relationship(back_populates="usage_logs", lazy="selectin")
    developer: Mapped[Developer] = relationship(back_populates="usage_logs", lazy="selectin")
