"""Service for creating editorial notifications on workflow events."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.article_workflow import ArticleWorkflow
from app.models.editorial_notification import EditorialNotification
from app.models.permission import UserRole
from app.models.role import Role
from app.models.user import User

logger = logging.getLogger(__name__)

EVENT_TITLES: dict[str, str] = {
    "article:submitted": "Article submitted for review",
    "article:assigned": "Article assigned to you",
    "article:approved": "Article approved",
    "article:rejected": "Article rejected",
    "article:revision_requested": "Revision requested on your article",
    "article:published": "Article published",
    "article:fact_check_complete": "Fact check completed",
}


async def notify_workflow_event(
    db: AsyncSession,
    article: Article,
    workflow: ArticleWorkflow,
    event_type: str,
    actor: User,
) -> None:
    """Create notifications for relevant users after a workflow event."""
    title = EVENT_TITLES.get(event_type, event_type)
    article_title = article.title[:80]

    recipients: set[UUID] = set()

    if event_type in ("article:submitted", "article:revision_requested"):
        recipients |= await _get_users_with_role(db, "chief_editor")

    elif event_type == "article:assigned":
        if workflow.assigned_to_id:
            recipients.add(workflow.assigned_to_id)

    elif event_type in ("article:approved", "article:rejected"):
        if article.reporter_id and article.reporter_id != actor.id:
            recipients.add(article.reporter_id)

    elif event_type == "article:published":
        recipients |= await _get_users_with_role(db, "chief_editor")

    elif event_type == "article:fact_check_complete":
        recipients |= await _get_users_with_role(db, "chief_editor")

    recipients.discard(actor.id)

    for recipient_id in recipients:
        db.add(EditorialNotification(
            recipient_id=recipient_id,
            actor_id=actor.id,
            article_id=article.id,
            event_type=event_type,
            title=title,
            message=f'"{article_title}"',
        ))

    await db.flush()
    logger.info("Created %d notifications for %s on article %s", len(recipients), event_type, article.id)


async def _get_users_with_role(db: AsyncSession, role_name: str) -> set[UUID]:
    """Get all active user IDs that have a specific role."""
    result = await db.execute(
        select(UserRole.user_id)
        .join(User, User.id == UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == role_name, User.is_active.is_(True))
    )
    return {row[0] for row in result.all()}
