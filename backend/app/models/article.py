"""Article model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ArticleStatus

if TYPE_CHECKING:
    from app.models.bookmark import Bookmark
    from app.models.category import Category
    from app.models.comment import Comment

    # --- NEW ADDITION ---
    from app.models.article_reaction import ArticleReaction
    from app.models.article_comment import ArticleComment
    from app.models.article_workflow import ArticleWorkflow
    from app.models.user import User
    from app.models.tag import Tag


class Article(Base):
    """Published news article."""

    __tablename__ = "articles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), unique=True, index=True, nullable=True)
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

    # --- NEW ADDITION ---
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # --- NMS: article location fields ---
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_country: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # --- NMS: editorial workflow fields ---
    status: Mapped[ArticleStatus] = mapped_column(
        SAEnum(ArticleStatus, name="article_status", create_constraint=True),
        nullable=False,
        default=ArticleStatus.DRAFT,
        index=True,
    )
    reporter_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    reactions: Mapped[list[ArticleReaction]] = relationship(
        back_populates="article",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    article_comments: Mapped[list[ArticleComment]] = relationship(
        back_populates="article",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    reporter: Mapped[User] = relationship(lazy="selectin", foreign_keys=[reporter_id])
    workflow: Mapped[ArticleWorkflow | None] = relationship(
        back_populates="article",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    tags: Mapped[list[Tag]] = relationship(
        secondary="article_tags",
        back_populates="articles",
        lazy="selectin",
    )

    # --- FIX 3: SEO & SLUG FIELDS ---
    slug: Mapped[str | None] = mapped_column(String(300), nullable=True, unique=True, index=True)
    seo_title: Mapped[str | None] = mapped_column(String(70), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(160), nullable=True)
    canonical_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_alt_text: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # --- FIX 2: POST-PUBLISH EDITING & CORRECTIONS ---
    correction_notice: Mapped[str | None] = mapped_column(Text, nullable=True)
    correction_added_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    correction_added_by_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_breaking_update: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    post_publish_edit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # --- FIX 1: SCHEDULED ARTICLES - scheduled_at for auto-publish ---
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- FIX 6: SOFT DELETE FIELDS ---
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    delete_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
