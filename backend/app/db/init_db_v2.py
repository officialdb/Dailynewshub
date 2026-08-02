"""Database initialization helpers for the v2 NMS database."""

import logging

from app.db.base import Base
from app.db.session_v2 import engine_v2
from app import models as _models  # noqa: F401  # Ensure model metadata is registered.

logger = logging.getLogger(__name__)


async def create_v2_tables() -> None:
    """Create all NMS tables in the v2 database."""

    async with engine_v2.begin() as conn:
        try:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        except Exception as e:
            # Handle duplicate enum types - they may already exist
            if "already exists" in str(e) or "duplicate" in str(e).lower():
                logger.warning("Some v2 types/tables already exist, continuing...")
            else:
                raise
