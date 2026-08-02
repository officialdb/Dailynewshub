"""merge v1 and v2 branches

Revision ID: a7e7f83866b4
Revises: b2c3d4e5f6g7, c7d8e9f0a1b2
Create Date: 2026-07-28 21:14:15.550316

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7e7f83866b4'
down_revision: Union[str, None] = ('b2c3d4e5f6g7', 'c7d8e9f0a1b2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
