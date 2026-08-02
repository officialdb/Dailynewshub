"""Workflow related background tasks."""

import logging
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_audit
from app.models.article import Article
from app.models.article_workflow import ArticleWorkflow
from app.models.enums import ArticleStatus
from app.services.push_notification import send_to_all
from app.websocket.connection_manager import connection_manager

logger = logging.getLogger(__name__)


# --- FIX 1: AUTO-PUBLISH SCHEDULED ARTICLES ---
async def auto_publish_scheduled_articles(db_session_factory: Callable[[], AsyncSession]) -> None:
    """
    Query all articles with status=SCHEDULED and scheduled_at <= utcnow().
    For each one, transition status to PUBLISHED.
    """
    now = datetime.now(timezone.utc)
    
    # We must instantiate our own session
    session = db_session_factory()
    try:
        # Find workflows that are SCHEDULED and scheduled_at <= now
        result = await session.execute(
            select(ArticleWorkflow)
            .where(ArticleWorkflow.status == ArticleStatus.SCHEDULED)
            .where(ArticleWorkflow.scheduled_at <= now)
        )
        workflows = result.scalars().all()
        
        for workflow in workflows:
            try:
                article = await session.get(Article, workflow.article_id)
                if not article:
                    continue

                old_status = workflow.status
                workflow.status = ArticleStatus.PUBLISHED
                workflow.published_at = workflow.published_at or now
                
                article.status = ArticleStatus.PUBLISHED
                article.published_at = workflow.published_at
                
                await log_audit(
                    session,
                    action="auto_published",
                    resource_type="article",
                    resource_id=article.id,
                    changes={"from_status": old_status.value, "to_status": ArticleStatus.PUBLISHED.value},
                )
                
                # Try to trigger FCM push
                try:
                    body_text = article.meta_description or article.description or ""
                    await send_to_all(
                        title=f"NEW: {article.title[:65]}",
                        body=body_text[:120],
                        data={"article_id": str(article.id), "slug": str(article.slug), "type": "new_article"},
                        db=session
                    )
                except Exception as e:
                    logger.warning("FCM delivery failed for auto-publish %s: %s", article.id, e)
                
                # Try to trigger websocket broadcast
                try:
                    await connection_manager.publish_event({
                        "type": "new_article",
                        "data": {
                            "id": str(article.id),
                            "title": article.title,
                            "slug": article.slug,
                            "description": article.description,
                            "image_url": article.image_url,
                            "category": article.category.slug if article.category else None,
                            "source_name": article.source_name,
                            "published_at": article.published_at.isoformat() if article.published_at else None,
                            "is_breaking_update": article.is_breaking_update
                        }
                    })
                except Exception as e:
                    logger.warning("Websocket broadcast failed for auto-publish %s: %s", article.id, e)

                await session.commit()
                logger.info("Auto-published scheduled article: %s", article.id)
                
            except Exception as item_exc:
                logger.error("Failed to auto-publish article %s: %s", workflow.article_id, item_exc)
                await session.rollback()

    except Exception as exc:
        logger.error("Auto-publish task failed: %s", exc)
    finally:
        await session.close()
