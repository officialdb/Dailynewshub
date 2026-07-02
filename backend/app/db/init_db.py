"""Database initialization helpers."""

from app.db.base import Base
from app.db.session import engine
from app import models as _models  # noqa: F401  # Ensure model metadata is registered.


async def create_tables() -> None:
    """Create all database tables defined by the ORM models."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
