"""Article revision history endpoints."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_current_user, get_db
from app.core.rbac import require_permission
from app.models.article import Article
from app.models.article_workflow import ArticleRevision
from app.models.user import User
from app.services.article_service import create_content_snapshot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/articles", tags=["revisions"])


@router.get("/{article_id}/revisions")
async def list_article_revisions(
    article_id: UUID,
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get the revision history for an article."""
    from app.core.rbac import has_permission

    result = await db.execute(
        select(Article).options(selectinload(Article.workflow)).where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if not article or not article.workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    if not has_permission(current_user, "article:view_all") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    revisions_res = await db.execute(
        select(ArticleRevision)
        .options(selectinload(ArticleRevision.reviewer))
        .where(ArticleRevision.workflow_id == article.workflow.id)
        .order_by(ArticleRevision.created_at.desc())
    )
    revisions = list(revisions_res.scalars().all())

    data = []
    for r in revisions:
        data.append({
            "id": str(r.id),
            "status": r.to_status,
            "revision_type": r.revision_type,
            "change_summary": r.comments,
            "editor_name": r.reviewer.name if r.reviewer else "Unknown",
            "created_at": r.created_at.isoformat(),
            # Truncate content for list preview
            "content_snapshot": r.content_snapshot[:200] if r.content_snapshot else None,
            "title_snapshot": r.title_snapshot,
        })

    return {"success": True, "message": "Revisions retrieved", "data": data}


@router.get("/{article_id}/revisions/{revision_id}")
async def get_article_revision(
    article_id: UUID,
    revision_id: UUID,
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a specific article revision in full."""
    from app.core.rbac import has_permission

    result = await db.execute(
        select(Article).options(selectinload(Article.workflow)).where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if not article or not article.workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    if not has_permission(current_user, "article:view_all") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    rev_res = await db.execute(
        select(ArticleRevision)
        .options(selectinload(ArticleRevision.reviewer))
        .where(ArticleRevision.id == revision_id, ArticleRevision.workflow_id == article.workflow.id)
    )
    r = rev_res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Revision not found")

    return {
        "success": True,
        "message": "Revision retrieved",
        "data": {
            "id": str(r.id),
            "status": r.to_status,
            "revision_type": r.revision_type,
            "change_summary": r.comments,
            "editor_name": r.reviewer.name if r.reviewer else "Unknown",
            "created_at": r.created_at.isoformat(),
            "content_snapshot": r.content_snapshot,
            "title_snapshot": r.title_snapshot,
        }
    }


@router.post("/{article_id}/revisions/{revision_id}/rollback")
async def rollback_article_revision(
    article_id: UUID,
    revision_id: UUID,
    current_user: User = Depends(require_permission("article:delete_any")), # Using admin/super-editor permission
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Roll back article content to a previous revision."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can rollback articles")

    result = await db.execute(
        select(Article).options(selectinload(Article.workflow)).where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if not article or not article.workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    rev_res = await db.execute(
        select(ArticleRevision)
        .where(ArticleRevision.id == revision_id, ArticleRevision.workflow_id == article.workflow.id)
    )
    revision = rev_res.scalar_one_or_none()
    if not revision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Revision not found")

    # Snapshot current state before replacing it
    await create_content_snapshot(article, current_user.id, "rollback", f"Rolled back to revision {str(revision_id)[:8]}", db)

    # Rollback
    if revision.title_snapshot:
        article.title = revision.title_snapshot
    if revision.content_snapshot:
        article.content = revision.content_snapshot
    
    article.post_publish_edit_count += 1
    
    await log_audit(
        db,
        action="article:rollback",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"to_revision": str(revision.id)},
    )
    await db.commit()
    
    from app.schemas.v2.article import ArticleResponseV2
    return {
        "success": True, 
        "message": "Article rolled back successfully",
        "data": ArticleResponseV2.model_validate(article).model_dump(mode="json")
    }
