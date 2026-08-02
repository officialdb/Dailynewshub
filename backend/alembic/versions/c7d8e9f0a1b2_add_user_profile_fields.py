"""add_user_profile_fields

Revision ID: c7d8e9f0a1b2
Revises: b2c3d4e5f6g7
Create Date: 2026-07-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d8e9f0a1b2"
down_revision: str = "8a882471f4e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone_number")
    op.drop_column("users", "state")
    op.drop_column("users", "country")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
