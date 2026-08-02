"""add_nms_rbac_workflow_tables

Revision ID: a1b2c3d4e5f6
Revises: c640f9a85366
Create Date: 2026-07-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSON


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str = "c640f9a85366"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enum types ---
    article_status = sa.Enum(
        "draft", "submitted", "under_review", "fact_checking",
        "validation", "editorial_review", "approved", "scheduled",
        "published", "archived", "rejected", "revision_requested",
        name="article_status",
    )
    fact_check_status = sa.Enum(
        "pending", "verified", "needs_evidence", "failed",
        name="fact_check_status",
    )
    article_status.create(op.get_bind())
    fact_check_status.create(op.get_bind())

    # --- RBAC tables ---
    op.create_table(
        "roles",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), unique=True, index=True, nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "permissions",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), unique=True, index=True, nullable=False),
        sa.Column("resource", sa.String(100), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "role_permissions",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("role_id", PGUUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission_id", PGUUID(as_uuid=True), sa.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False),
    )

    op.create_table(
        "user_roles",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", PGUUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- API Keys ---
    op.create_table(
        "api_keys",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("key_hash", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("prefix", sa.String(12), nullable=False),
        sa.Column("owner_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rate_limit", sa.Integer(), nullable=False, server_default=sa.text("1000")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- Audit Logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("changes", JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_resource", "audit_logs", ["resource_type", "resource_id"])
    op.create_index("ix_audit_logs_user_action", "audit_logs", ["user_id", "action"])

    # --- Article Workflow ---
    op.create_table(
        "article_workflows",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("article_id", PGUUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("status", sa.Enum(
            "draft", "submitted", "under_review", "fact_checking",
            "validation", "editorial_review", "approved", "scheduled",
            "published", "archived", "rejected", "revision_requested",
            name="article_status",
        ), nullable=False, server_default="draft", index=True),
        sa.Column("assigned_to_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "article_revisions",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", PGUUID(as_uuid=True), sa.ForeignKey("article_workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewer_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("from_status", sa.String(50), nullable=False),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("comments", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "fact_checks",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", PGUUID(as_uuid=True), sa.ForeignKey("article_workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checker_id", PGUUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("status", sa.Enum(
            "pending", "verified", "needs_evidence", "failed",
            name="fact_check_status",
        ), nullable=False, server_default="pending", index=True),
        sa.Column("findings", sa.Text, nullable=True),
        sa.Column("sources_verified", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- Add NMS columns to articles ---
    op.add_column(
        "articles",
        sa.Column(
            "status",
            sa.Enum(
                "draft", "submitted", "under_review", "fact_checking",
                "validation", "editorial_review", "approved", "scheduled",
                "published", "archived", "rejected", "revision_requested",
                name="article_status",
            ),
            nullable=False,
            server_default="draft",
        ),
    )
    op.create_index("ix_articles_status", "articles", ["status"])

    op.add_column(
        "articles",
        sa.Column(
            "reporter_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_articles_reporter_id", "articles", ["reporter_id"])

    # Make source_url nullable for manually created articles
    op.alter_column(
        "articles",
        "source_url",
        existing_type=sa.String(1000),
        nullable=True,
    )


def downgrade() -> None:
    # Remove NMS columns from articles
    op.alter_column(
        "articles",
        "source_url",
        existing_type=sa.String(1000),
        nullable=False,
    )
    op.drop_index("ix_articles_reporter_id", table_name="articles")
    op.drop_column("articles", "reporter_id")
    op.drop_index("ix_articles_status", table_name="articles")
    op.drop_column("articles", "status")

    # Drop workflow tables
    op.drop_table("fact_checks")
    op.drop_table("article_revisions")
    op.drop_table("article_workflows")

    # Drop audit tables
    op.drop_index("ix_audit_logs_user_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_resource", table_name="audit_logs")
    op.drop_table("audit_logs")

    # Drop API keys
    op.drop_table("api_keys")

    # Drop RBAC tables
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS fact_check_status")
    op.execute("DROP TYPE IF EXISTS article_status")
