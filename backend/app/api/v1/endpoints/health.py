# --- DOCKER FIX ---
"""Health and system status routes."""


from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import get_db, get_redis
from app.core.scheduler import scheduler
from app.core.runtime import collect_runtime_status


router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis_client=Depends(get_redis),
) -> JSONResponse:
    """Check API, PostgreSQL, and Redis readiness for Docker healthchecks."""

    checks = {"status": "healthy", "postgres": "ok", "redis": "ok"}
    status_code = 200

    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        checks["postgres"] = f"error: {exc}"
        checks["status"] = "degraded"
        status_code = 503

    try:
        await redis_client.ping()
    except Exception as exc:
        checks["redis"] = f"error: {exc}"
        checks["status"] = "degraded"
        status_code = 503

    return JSONResponse(content=checks, status_code=status_code)


@router.get("/status")
async def system_status(
    request: Request,
) -> dict[str, Any]:
    """Return a basic readiness snapshot for core infrastructure."""

    runtime_status = getattr(request.app.state, "runtime_status", None)
    if runtime_status is None:
        runtime_status = await collect_runtime_status(getattr(request.app.state, "redis", None))

    return {
        "success": True,
        "message": "System status retrieved successfully",
        "data": {
            "service": settings.APP_NAME,
            "status": runtime_status["overall"],
            "database": runtime_status["database"],
            "redis": runtime_status["redis"],
            "scheduler": "running" if scheduler.running else "stopped",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
