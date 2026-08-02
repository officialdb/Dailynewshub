"""Article workflow models — status tracking, revisions, and fact checking."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ArticleStatus, FactCheckStatus

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.user import User


class ArticleWorkflow(Base):
    """Tracks the current workflow state of an article."""

    __tablename__ = "article_workflows"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    article_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("articles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    status: Mapped[ArticleStatus] = mapped_column(
        SAEnum(ArticleStatus, name="article_status", create_constraint=True),
        nullable=False,
        default=ArticleStatus.DRAFT,
        index=True,
    )
    assigned_to_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    article: Mapped[Article] = relationship(back_populates="workflow", lazy="selectin")
    assigned_to: Mapped[User] = relationship(lazy="selectin")

    revisions: Mapped[list[ArticleRevision]] = relationship(
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    fact_checks: Mapped[list[FactCheck]] = relationship(
        back_populates="workflow",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ArticleRevision(Base):
    """Record of each review action on an article."""

    __tablename__ = "article_revisions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    workflow_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("article_workflows.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    from_status: Mapped[str] = mapped_column(String(50), nullable=False)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # --- FIX 9: VERSION HISTORY & CONTENT DIFFS ---
    content_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    title_snapshot: Mapped[str | None] = mapped_column(String(500), nullable=True)
    change_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    revision_type: Mapped[str] = mapped_column(String(50), nullable=False, default="status_change")

    workflow: Mapped[ArticleWorkflow] = relationship(back_populates="revisions")
    reviewer: Mapped[User] = relationship(lazy="selectin")


class FactCheck(Base):
    """Fact checking record for an article."""

    __tablename__ = "fact_checks"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    workflow_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("article_workflows.id", ondelete="CASCADE"),
        nullable=False,
    )
    checker_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    status: Mapped[FactCheckStatus] = mapped_column(
        SAEnum(FactCheckStatus, name="fact_check_status", create_constraint=True),
        nullable=False,
        default=FactCheckStatus.PENDING,
        index=True,
    )
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    sources_verified: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    workflow: Mapped[ArticleWorkflow] = relationship(back_populates="fact_checks")
    checker: Mapped[User] = relationship(lazy="selectin")
