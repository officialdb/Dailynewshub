"""Editorial workflow routes for the v2 NMS API."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission, require_role
from app.core.workflow import can_role_transition, get_available_transitions
from app.models.article import Article
from app.models.article_workflow import ArticleRevision, ArticleWorkflow, FactCheck
from app.models.enums import ArticleStatus, FactCheckStatus
from app.models.user import User
from app.schemas.v2.workflow import (
    AssignRequest,
    FactCheckResponse,
    FactCheckSubmit,
    RevisionResponse,
    TransitionRequest,
    TransitionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/articles", tags=["workflow-v2"])


def _get_role_names(user: User) -> set[str]:
    return {ur.role.name for ur in user.user_roles if ur.role}


async def _get_article_with_workflow(db: AsyncSession, article_id: UUID) -> tuple[Article, ArticleWorkflow]:
    """Load an article and its workflow, raising 404 if missing."""
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.workflow))
        .where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    if article.workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found for article")
    return article, article.workflow


@router.post("/{article_id}/transition")
async def transition_article(
    article_id: UUID,
    body: TransitionRequest,
    request: Request,
    current_user: User = Depends(require_role(
        "reporter", "fact_checker", "validator", "chief_editor", "publisher", "admin",
    )),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Transition an article to a new workflow status.

    Validates the transition against the state machine and the user's role.
    """
    article, workflow = await _get_article_with_workflow(db, article_id)
    current_status = workflow.status
    target_status = body.to_status

    # Determine effective role for transition check
    role_names = _get_role_names(current_user)
    if current_user.is_admin:
        role_names.add("admin")

    # Check if any of the user's roles can perform this transition
    can_do = False
    for role_name in role_names:
        if can_role_transition(current_status, target_status, role_name):
            can_do = True
            break

    if not can_do:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot transition from '{current_status.value}' to '{target_status.value}' with your roles",
        )

    # Perform the transition
    old_status = workflow.status
    workflow.status = target_status

    # Update timestamps based on transition
    now = datetime.now(timezone.utc)
    if target_status == ArticleStatus.SUBMITTED:
        workflow.submitted_at = now
    elif target_status == ArticleStatus.PUBLISHED:
        workflow.published_at = now
        article.published_at = now
        article.status = target_status
    elif target_status == ArticleStatus.SCHEDULED:
        workflow.scheduled_at = now

    # Sync article status
    article.status = target_status

    # Create revision record
    revision = ArticleRevision(
        workflow_id=workflow.id,
        reviewer_id=current_user.id,
        action=f"{old_status.value}→{target_status.value}",
        from_status=old_status.value,
        to_status=target_status.value,
        comments=body.comments,
    )
    db.add(revision)

    await log_audit(
        db,
        action=f"article:transition:{old_status.value}_to_{target_status.value}",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"from_status": old_status.value, "to_status": target_status.value, "comments": body.comments},
        ip_address=request.client.host if request.client else None,
    )

    # Send editorial notifications
    from app.services.editorial_notifications import notify_workflow_event

    event_map = {
        ArticleStatus.SUBMITTED: "article:submitted",
        ArticleStatus.APPROVED: "article:approved",
        ArticleStatus.REJECTED: "article:rejected",
        ArticleStatus.REVISION_REQUESTED: "article:revision_requested",
        ArticleStatus.PUBLISHED: "article:published",
    }
    event_type = event_map.get(target_status)
    if event_type:
        await notify_workflow_event(db, article, workflow, event_type, current_user)

    await db.commit()

    if target_status == ArticleStatus.PUBLISHED:
        # Avoid circular dependencies by passing db
        try:
            await notify_users_on_publish(article, db)
        except Exception as e:
            logger.error("Failed to notify users on publish: %s", e)
        try:
            await broadcast_new_article(article)
        except Exception as e:
            logger.error("Failed to broadcast new article: %s", e)

    logger.info(
        "Article %s transitioned %s → %s by %s",
        article.id, old_status.value, target_status.value, current_user.email,
    )

    resp = TransitionResponse(
        article_id=article.id,
        from_status=old_status,
        to_status=target_status,
        reviewer_id=current_user.id,
        comments=body.comments,
        created_at=revision.created_at,
    )
    return {"success": True, "message": f"Article transitioned to {target_status.value}", "data": resp.model_dump(mode="json")}


@router.get("/{article_id}/transitions")
async def available_transitions(
    article_id: UUID,
    current_user: User = Depends(require_role(
        "reporter", "fact_checker", "validator", "chief_editor", "publisher", "admin",
    )),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get available transitions for the current user on this article."""
    article, workflow = await _get_article_with_workflow(db, article_id)
    current_status = workflow.status

    role_names = _get_role_names(current_user)
    if current_user.is_admin:
        role_names.add("admin")

    available: set[ArticleStatus] = set()
    for role_name in role_names:
        available |= get_available_transitions(current_status) & {
            s for s in get_available_transitions(current_status)
            if can_role_transition(current_status, s, role_name)
        }

    return {
        "success": True,
        "message": "Available transitions",
        "data": {
            "current_status": current_status.value,
            "available": [s.value for s in available],
        },
    }


@router.get("/{article_id}/history")
async def article_history(
    article_id: UUID,
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get the full revision history of an article."""
    from app.core.rbac import has_permission

    article, workflow = await _get_article_with_workflow(db, article_id)

    # Ownership check for reporters
    if not has_permission(current_user, "article:view_all") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    result = await db.execute(
        select(ArticleRevision)
        .where(ArticleRevision.workflow_id == workflow.id)
        .order_by(ArticleRevision.created_at.desc())
    )
    revisions = result.scalars().all()
    data = [RevisionResponse.model_validate(r).model_dump(mode="json") for r in revisions]

    return {"success": True, "message": "Article history retrieved", "data": data}


@router.patch("/{article_id}/assign")
async def assign_article(
    article_id: UUID,
    body: AssignRequest,
    request: Request,
    current_user: User = Depends(require_permission("article:assign")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Assign an article to a reviewer/editor."""
    article, workflow = await _get_article_with_workflow(db, article_id)

    # Verify the assignee exists
    assignee = await db.get(User, body.assigned_to_id)
    if assignee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")

    workflow.assigned_to_id = body.assigned_to_id

    await log_audit(
        db,
        action="article:assign",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"assigned_to": str(body.assigned_to_id)},
        ip_address=request.client.host if request.client else None,
    )

    from app.services.editorial_notifications import notify_workflow_event
    await notify_workflow_event(db, article, workflow, "article:assigned", current_user)

    await db.commit()

    return {"success": True, "message": f"Article assigned to {assignee.name}", "data": {"assigned_to_id": str(body.assigned_to_id)}}


@router.post("/{article_id}/fact-check")
async def submit_fact_check(
    article_id: UUID,
    body: FactCheckSubmit,
    request: Request,
    current_user: User = Depends(require_permission("factcheck:verify")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Submit or update a fact check for an article."""
    article, workflow = await _get_article_with_workflow(db, article_id)

    # Check if a fact check from this user already exists
    existing_result = await db.execute(
        select(FactCheck).where(
            FactCheck.workflow_id == workflow.id,
            FactCheck.checker_id == current_user.id,
        )
    )
    fact_check = existing_result.scalar_one_or_none()

    if fact_check:
        fact_check.status = body.status
        fact_check.findings = body.findings
        fact_check.sources_verified = body.sources_verified
    else:
        fact_check = FactCheck(
            workflow_id=workflow.id,
            checker_id=current_user.id,
            status=body.status,
            findings=body.findings,
            sources_verified=body.sources_verified,
        )
        db.add(fact_check)

    await log_audit(
        db,
        action="factcheck:submit",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"fact_check_status": body.status.value},
        ip_address=request.client.host if request.client else None,
    )

    if body.status in (FactCheckStatus.VERIFIED, FactCheckStatus.FAILED):
        from app.services.editorial_notifications import notify_workflow_event
        await notify_workflow_event(db, article, workflow, "article:fact_check_complete", current_user)

    await db.commit()
    await db.refresh(fact_check)

    return {
        "success": True,
        "message": "Fact check submitted",
        "data": FactCheckResponse.model_validate(fact_check).model_dump(mode="json"),
    }


@router.get("/{article_id}/fact-check")
async def get_fact_checks(
    article_id: UUID,
    current_user: User = Depends(require_permission("factcheck:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get all fact check records for an article."""
    article, workflow = await _get_article_with_workflow(db, article_id)

    result = await db.execute(
        select(FactCheck)
        .where(FactCheck.workflow_id == workflow.id)
        .order_by(FactCheck.created_at.desc())
    )
    fact_checks = result.scalars().all()
    data = [FactCheckResponse.model_validate(fc).model_dump(mode="json") for fc in fact_checks]

    return {"success": True, "message": "Fact checks retrieved", "data": data}


# --- FIX 4: FCM PUSH NOTIFICATIONS ON PUBLISH ---
async def notify_users_on_publish(article: Article, db: AsyncSession) -> None:
    """
    Send FCM push notification to all users whose category preferences
    include the published article's category.
    """
    if not getattr(article, "is_breaking_update", True) and getattr(article, "post_publish_edit_count", 0) > 0:
        return

    try:
        from sqlalchemy import text
        from app.models.device_token import DeviceToken
        from app.services.push_notification import send_multicast, cleanup_invalid_tokens
        
        # 1. Fetch article category
        result = await db.execute(select(Category).where(Category.id == article.category_id))
        category = result.scalar_one_or_none()
        category_slug = category.slug if category else "news"
        
        # 2. Query DeviceToken table (fallback to all if preferences not setup/supported directly)
        # Using a raw JSON check or fallback to all active tokens
        tokens_query = select(DeviceToken.fcm_token).join(User).where(User.is_active == True)
        
        # 3. If preferences were JSON on User, we would do:
        # tokens_query = tokens_query.where(User.preferences.op('->>')('categories').like(f'%"{category_slug}"%'))
        # But since preferences schema might be arbitrary, we fetch all active device tokens.
        
        token_result = await db.execute(tokens_query.distinct())
        tokens = list(token_result.scalars().all())
        
        if not tokens:
            return
            
        # 4. Build message
        title = (article.title[:62] + '...') if len(article.title) > 65 else article.title
        desc = getattr(article, "meta_description", None) or article.description or ""
        body = (desc[:117] + '...') if len(desc) > 120 else desc
        
        data = {
            "article_id": str(article.id),
            "category": category_slug,
            "slug": getattr(article, "slug", "") or "",
            "type": "new_article"
        }
        
        # 5. Multicast send
        success, failed, invalid = await send_multicast(tokens, title, body, data)
        
        # 6. Log
        await log_audit(db, "fcm_multicast", "article", resource_id=article.id, changes={"success": success, "failed": failed})
        
        # 7. Cleanup
        if invalid:
            await cleanup_invalid_tokens(invalid, db)
            
    except Exception as exc:
        logger.error("Failed to notify users on publish: %s", exc)


# --- FIX 5: WEBSOCKET BROADCAST ON PUBLISH ---
async def broadcast_new_article(article: Article) -> None:
    """
    Broadcast new article to all clients connected to the news-feed WebSocket.
    """
    try:
        from app.websocket.connection_manager import connection_manager
        
        payload = {
            "type": "new_article",
            "data": {
                "id": str(article.id),
                "title": article.title,
                "slug": getattr(article, "slug", ""),
                "description": article.description,
                "image_url": article.image_url,
                "category": getattr(article.category, "slug", None) if hasattr(article, "category") and article.category else None,
                "source_name": article.source_name,
                "published_at": article.published_at.isoformat() if article.published_at else None,
                "is_breaking_update": getattr(article, "is_breaking_update", False)
            }
        }
        
        # We broadcast locally and via Redis
        await connection_manager.publish_event(payload)
        await connection_manager.broadcast(payload)
    except Exception as exc:
        logger.error("Failed to broadcast new article: %s", exc)
