"""Reel Like model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.reel import Reel


class ReelLike(Base):
    """User like on a Reel."""

    __tablename__ = "reel_likes"
    __table_args__ = (UniqueConstraint("user_id", "reel_id", name="uq_reel_likes_user_reel"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reel_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("reels.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    reel: Mapped[Reel] = relationship(back_populates="likes", lazy="selectin")
