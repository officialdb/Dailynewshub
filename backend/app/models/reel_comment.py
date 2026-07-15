"""Reel Comment model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.reel import Reel
    from app.models.user import User


class ReelComment(Base):
    """User comment on a Reel."""

    __tablename__ = "reel_comments"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reel_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("reels.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("reel_comments.id", ondelete="CASCADE"), nullable=True, default=None)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(lazy="selectin")
    reel: Mapped[Reel] = relationship(back_populates="comments", lazy="selectin")
    replies: Mapped[list[ReelComment]] = relationship(
        "ReelComment",
        primaryjoin="ReelComment.parent_id == ReelComment.id",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
