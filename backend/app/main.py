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
import logging
import os

log_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(log_formatter)
log_handlers: list[logging.Handler] = [stream_handler]

log_file = os.getenv("APP_LOG_FILE", "app.log")
try:
    file_handler = logging.FileHandler(log_file)
except OSError:
    file_handler = None
else:
    file_handler.setFormatter(log_formatter)
    log_handlers.append(file_handler)

logging.basicConfig(level=logging.INFO, handlers=log_handlers)

# Route uvicorn logs to the same file without duplicating
if file_handler is not None:
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        logger = logging.getLogger(logger_name)
        logger.addHandler(file_handler)
        logger.propagate = False

from app.api.v1.router import router as api_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v2.router import router as api_v2_router
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.scheduler import shutdown_scheduler, start_scheduler
from app.db.init_db import create_tables
from app.db.init_db_v2 import create_v2_tables
from app.core.runtime import collect_runtime_status
from app.websocket.connection_manager import connection_manager
from app.middleware.api_key_middleware import APIKeyMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

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
    await create_v2_tables()
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

# --- SEC FIX SEC-006 ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- SEC FIX SEC-008 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "X-Request-ID"],
    max_age=3600,
)

app.include_router(api_router)
app.include_router(api_v2_router)
# --- DOCKER FIX ---
app.include_router(health_router, tags=["Health"])

# --- API PLATFORM ---
app.add_middleware(APIKeyMiddleware)
