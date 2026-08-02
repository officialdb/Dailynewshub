"""add_phase3_tags_notifications

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-27 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID


revision: str = "b2c3d4e5f6g7"
down_revision: str = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tags
    op.create_table(
        "tags",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), unique=True, index=True, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, index=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Article-Tag association
    op.create_table(
        "article_tags",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("article_id", PGUUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tag_id", PGUUID(as_uuid=True), sa.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_article_tags_article_id", "article_tags", ["article_id"])
    op.create_index("ix_article_tags_tag_id", "article_tags", ["tag_id"])

    # Editorial notifications
    op.create_table(
        "editorial_notifications",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("recipient_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("actor_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("article_id", PGUUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_editorial_notifications_recipient_read", "editorial_notifications", ["recipient_id", "is_read"])


def downgrade() -> None:
    op.drop_table("editorial_notifications")
    op.drop_index("ix_article_tags_tag_id", table_name="article_tags")
    op.drop_index("ix_article_tags_article_id", table_name="article_tags")
    op.drop_table("article_tags")
    op.drop_table("tags")
