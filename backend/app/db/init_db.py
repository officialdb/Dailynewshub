"""Database initialization helpers."""

import logging

from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine
from app import models as _models  # noqa: F401  # Ensure model metadata is registered.

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    """Create all database tables defined by the ORM models."""

    async with engine.begin() as conn:
        try:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        except Exception as e:
            # Handle duplicate enum types - they may already exist
            if "already exists" in str(e) or "duplicate" in str(e).lower():
                logger.warning("Some types/tables already exist, continuing...")
            else:
                raise
