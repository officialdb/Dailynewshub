"""Article analytics model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.user import User


class ArticleAnalytic(Base):
    """Analytics per article."""

    __tablename__ = "article_analytics"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    article_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)
    read_depth_percent: Mapped[float] = mapped_column(Float, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Enum('push_notification', 'feed', 'search', 'direct', 'share', 'recommendation')
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    # Enum('ios', 'android')
    device_platform: Mapped[str] = mapped_column(String(20), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    article: Mapped[Article] = relationship(lazy="selectin")
    user: Mapped[User | None] = relationship(lazy="selectin")

    __table_args__ = (
        Index("ix_article_analytics_article_id_created_at", "article_id", "created_at"),
    )
