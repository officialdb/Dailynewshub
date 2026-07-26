"""Reel watch event model — tracks user viewing behaviour for recommendations."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReelWatchEvent(Base):
    """Records how much of a reel a user watched.

    Fields
    ------
    watch_duration_seconds : int
        How many seconds the user actually watched.
    completion_ratio : float
        watch_duration / reel duration, clipped to [0, 1].
        A value < 0.2 is treated as a "skip".
    skipped : bool
        True when the user left within the first 20 % of the video.
    """

    __tablename__ = "reel_watch_events"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reel_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("reels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    watch_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    completion_ratio: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    skipped: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
