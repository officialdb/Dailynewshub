"""Reel model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.reel_like import ReelLike
    from app.models.reel_comment import ReelComment


class Reel(Base):
    """Short-form video content from YouTube."""

    __tablename__ = "reels"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    youtube_video_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    channel_id: Mapped[str] = mapped_column(String(255), nullable=False)
    channel_name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel_logo_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    category_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # --- BUG FIX ---
    aspect_ratio: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="16:9",
        comment="Video aspect ratio: 16:9 for landscape, 9:16 for vertical/Shorts"
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    category: Mapped[Category | None] = relationship(lazy="selectin")
    likes: Mapped[list[ReelLike]] = relationship(
        back_populates="reel",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    comments: Mapped[list[ReelComment]] = relationship(
        back_populates="reel",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
