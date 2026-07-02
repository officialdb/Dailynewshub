"""FastAPI application entry point for Daily News Hub."""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import router as api_router
from app.core.config import get_settings
from app.core.scheduler import shutdown_scheduler, start_scheduler
from app.db.init_db import create_tables
from app.core.runtime import collect_runtime_status
from app.websocket.connection_manager import connection_manager

settings = get_settings()
uploads_root = Path(__file__).resolve().parents[1] / settings.UPLOADS_DIR
uploads_root.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage startup and shutdown side effects."""

    app.state.instance_id = uuid4().hex
    app.state.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    await app.state.redis.ping()
    app.state.runtime_status = None
    await create_tables()
    app.state.runtime_status = await collect_runtime_status(app.state.redis)
    connection_manager.configure(app.state.redis, app.state.instance_id)
    await connection_manager.start_redis_listener()
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()
        await connection_manager.stop_redis_listener()
        await app.state.redis.aclose()


app = FastAPI(title="Daily News Hub API", version="1.0.0", lifespan=lifespan)
app.mount("/media", StaticFiles(directory=uploads_root), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
