"""Dashboard and analytics routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies_v2 import get_db, get_current_user
from app.core.rbac import require_permission
from app.models.api_key import ApiKey
from app.models.developer_api_key import DeveloperApiKey
from app.models.article import Article
from app.models.article_workflow import ArticleWorkflow
from app.models.audit_log import AuditLog
from app.models.enums import ArticleStatus
from app.models.user import User
from app.schemas.v2.dashboard import DashboardStats, MyAssignment, PipelineStage, PipelineStats, RecentActivity, StatusCount

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard-v2"])


@router.get("/stats")
async def dashboard_stats(
    current_user: User = Depends(require_permission("analytics:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """High-level dashboard statistics."""
    total_articles = int(await db.scalar(select(func.count(Article.id))) or 0)
    total_users = int(await db.scalar(select(func.count(User.id))) or 0)
    total_system_keys = int(await db.scalar(select(func.count(ApiKey.id)).where(ApiKey.is_active.is_(True))) or 0)
    total_dev_keys = int(await db.scalar(select(func.count(DeveloperApiKey.id)).where(DeveloperApiKey.is_active.is_(True))) or 0)
    total_api_keys = total_system_keys + total_dev_keys

    # Count by status
    status_query = select(Article.status, func.count(Article.id)).group_by(Article.status)
    status_result = await db.execute(status_query)
    by_status = [
        StatusCount(status=row[0].value if hasattr(row[0], "value") else str(row[0]), count=row[1])
        for row in status_result.all()
    ]

    stats = DashboardStats(
        total_articles=total_articles,
        total_users=total_users,
        total_api_keys=total_api_keys,
        by_status=by_status,
    )
    return {"success": True, "message": "Dashboard stats retrieved", "data": stats.model_dump(mode="json")}


@router.get("/pipeline")
async def editorial_pipeline(
    current_user: User = Depends(require_permission("analytics:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Editorial pipeline — articles in each workflow stage."""
    stage_labels = {
        ArticleStatus.DRAFT: "Draft",
        ArticleStatus.SUBMITTED: "Submitted",
        ArticleStatus.UNDER_REVIEW: "Under Review",
        ArticleStatus.FACT_CHECKING: "Fact Checking",
        ArticleStatus.VALIDATION: "Validation",
        ArticleStatus.EDITORIAL_REVIEW: "Editorial Review",
        ArticleStatus.APPROVED: "Approved",
        ArticleStatus.SCHEDULED: "Scheduled",
        ArticleStatus.PUBLISHED: "Published",
        ArticleStatus.ARCHIVED: "Archived",
        ArticleStatus.REJECTED: "Rejected",
        ArticleStatus.REVISION_REQUESTED: "Revision Requested",
    }

    result = await db.execute(
        select(ArticleWorkflow.status, func.count(ArticleWorkflow.id)).group_by(ArticleWorkflow.status)
    )
    counts = {row[0]: row[1] for row in result.all()}

    stages = []
    total_in_pipeline = 0
    for status_enum, label in stage_labels.items():
        count = counts.get(status_enum, 0)
        stages.append(PipelineStage(status=status_enum.value, count=count, label=label))
        if status_enum not in (ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED, ArticleStatus.REJECTED):
            total_in_pipeline += count

    pipeline = PipelineStats(stages=stages, total_in_pipeline=total_in_pipeline)
    return {"success": True, "message": "Pipeline stats retrieved", "data": pipeline.model_dump(mode="json")}


@router.get("/recent-activity")
async def recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_permission("audit:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Recent audit log entries."""
    result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    entries = result.scalars().all()
    data = [
        RecentActivity(
            action=entry.action,
            resource_type=entry.resource_type,
            user_name=entry.user.name if entry.user else None,
            created_at=entry.created_at.isoformat(),
        ).model_dump(mode="json")
        for entry in entries
    ]

    return {"success": True, "message": "Recent activity retrieved", "data": data}


@router.get("/my-assignments")
async def my_assignments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Articles assigned to the current user."""
    result = await db.execute(
        select(ArticleWorkflow)
        .options(
            selectinload(ArticleWorkflow.article).selectinload(Article.category),
        )
        .where(
            ArticleWorkflow.assigned_to_id == current_user.id,
            ArticleWorkflow.status.notin_([
                ArticleStatus.PUBLISHED,
                ArticleStatus.ARCHIVED,
                ArticleStatus.REJECTED,
            ]),
        )
        .order_by(ArticleWorkflow.updated_at.desc())
    )
    workflows = result.scalars().unique().all()
    data = [
        MyAssignment(
            article_id=str(wf.article.id),
            title=wf.article.title,
            status=wf.status.value,
            category_name=wf.article.category.name if wf.article.category else None,
            assigned_at=wf.updated_at.isoformat() if wf.updated_at else None,
        ).model_dump(mode="json")
        for wf in workflows
    ]

    return {"success": True, "message": "My assignments retrieved", "data": data}
