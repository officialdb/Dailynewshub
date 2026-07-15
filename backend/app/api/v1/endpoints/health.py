"""Health and system status routes."""


from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.scheduler import scheduler
from app.core.runtime import collect_runtime_status


router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Return a lightweight liveness response."""

    return {
        "success": True,
        "message": "API is healthy",
        "data": {
            "status": "ok",
            "service": settings.APP_NAME,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


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
