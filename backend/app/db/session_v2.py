"""Asynchronous SQLAlchemy engine and session factory for the NMS (v2) database."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings


settings = get_settings()

engine_v2 = create_async_engine(settings.DATABASE_V2_URL, echo=settings.DEBUG)
AsyncSessionLocalV2 = async_sessionmaker(bind=engine_v2, autoflush=False, autocommit=False, expire_on_commit=False)


async def get_db_v2() -> AsyncGenerator[AsyncSession, None]:
    """Yield an asynchronous session for the v2 NMS database."""

    async with AsyncSessionLocalV2() as session:
        yield session
