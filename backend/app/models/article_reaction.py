"""Article Reaction model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.user import User


class ArticleReaction(Base):
    """User reaction to an Article."""

    __tablename__ = "article_reactions"
    __table_args__ = (UniqueConstraint("user_id", "article_id", name="uq_article_reactions_user_article"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    article_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    reaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # fire, wow, like
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user: Mapped[User] = relationship(lazy="selectin")
    article: Mapped[Article] = relationship(back_populates="reactions", lazy="selectin")
