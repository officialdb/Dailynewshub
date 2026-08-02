"""Daily aggregated usage counters for developer API keys."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Date, ForeignKey, Integer, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.developer import Developer
    from app.models.developer_api_key import DeveloperApiKey


# --- API PLATFORM ---
class UsageCounter(Base):
    """Aggregated request counters synced from Redis."""

    __tablename__ = "usage_counters"
    __table_args__ = (
        UniqueConstraint("api_key_id", "date", name="uq_usage_counters_api_key_id_date"),
        Index("ix_usage_counters_developer_id_date", "developer_id", "date"),
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
    date: Mapped[date] = mapped_column(Date, nullable=False)
    request_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    api_key: Mapped[DeveloperApiKey] = relationship(lazy="selectin")
    developer: Mapped[Developer] = relationship(lazy="selectin")
