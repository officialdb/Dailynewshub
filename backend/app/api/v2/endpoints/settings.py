"""System settings and health routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission
from app.models.article import Article
from app.models.enums import ArticleStatus
from app.models.user import User
from app.schemas.v2.settings import HealthStatus, SystemSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system-v2"])

settings = get_settings()


@router.get("/settings")
async def get_system_settings(
    current_user: User = Depends(require_permission("system:settings")),
) -> dict[str, Any]:
    """Get system-wide settings (read-only for now)."""
    data = SystemSettings(
        app_name=settings.APP_NAME,
        version="2.0.0",
        max_upload_size_mb=10,
        allowed_image_types=["image/jpeg", "image/png", "image/webp", "image/gif"],
        default_rate_limit=1000,
        workflow_states=[s.value for s in ArticleStatus],
        system_roles=[
            "reporter", "fact_checker", "validator",
            "chief_editor", "publisher", "auditor", "admin", "reader",
        ],
    )
    return {"success": True, "message": "System settings", "data": data.model_dump(mode="json")}


@router.get("/health")
async def health_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """System health check — database and Redis connectivity."""
    db_status = "ok"
    redis_status = "ok"

    try:
        await db.execute(select(func.count(Article.id)))
    except Exception:
        db_status = "error"

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "error"
    else:
        redis_status = "unavailable"

    data = HealthStatus(
        status="healthy" if db_status == "ok" else "degraded",
        database=db_status,
        redis=redis_status,
        version="2.0.0",
    )
    return {"success": True, "message": "Health check", "data": data.model_dump(mode="json")}
