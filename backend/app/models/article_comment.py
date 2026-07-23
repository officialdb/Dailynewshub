"""Article Comment model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.user import User


class ArticleComment(Base):
    """User comment on an Article."""

    __tablename__ = "article_comments"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    article_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(lazy="selectin")
    article: Mapped[Article] = relationship(back_populates="article_comments", lazy="selectin")

    @property
    def user_name(self) -> str:
        """Expose the author's display name for API responses."""
        return self.user.name if self.user else ""

    @property
    def user_avatar_url(self) -> str | None:
        """Expose the author's avatar URL for API responses."""
        return self.user.avatar_url if self.user else None
