"""Article model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.bookmark import Bookmark
    from app.models.category import Category
    from app.models.comment import Comment


class Article(Base):
    """Published news article."""

    __tablename__ = "articles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str] = mapped_column(String(1000), unique=True, index=True, nullable=False)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_trending: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    category: Mapped[Category] = relationship(back_populates="articles", lazy="selectin")
    bookmarks: Mapped[list[Bookmark]] = relationship(
        back_populates="article",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    comments: Mapped[list[Comment]] = relationship(
        back_populates="article",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
