"""Article CRUD routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission
from app.models.article import Article
from app.models.article_workflow import ArticleWorkflow
from app.models.category import Category
from app.models.enums import ArticleStatus
from app.models.user import User
from app.schemas.v2.article import (
    ArticleCreateV2,
    ArticleResponseV2,
    ArticleUpdateV2,
    CorrectionNoticeRequest,
    DeleteArticleRequest,
)
from app.schemas.v2.tag import ArticleTagsUpdate
from app.services.article_service import generate_slug, create_content_snapshot
from app.services.push_notification import send_to_all
from app.services.sanitization_service import sanitize_article_html, sanitize_plain_text
from app.websocket.connection_manager import connection_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/articles", tags=["articles-v2"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


def _to_response(article: Article) -> dict[str, Any]:
    """Build an ArticleResponseV2 from an ORM instance."""
    data = ArticleResponseV2.model_validate(article).model_dump(mode="json")
    return data


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_article(
    body: ArticleCreateV2,
    request: Request,
    current_user: User = Depends(require_permission("article:create")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Reporter creates a new article. Auto-creates workflow in draft state."""
    # Verify category exists
    cat = await db.get(Category, body.category_id)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    article = Article(
        # --- SEC FIX SEC-010 ---
        title=sanitize_plain_text(body.title),
        description=sanitize_plain_text(body.description),
        content=sanitize_article_html(body.content),
        image_url=body.image_url,
        source_name=body.source_name,
        source_url=body.source_url,
        author=body.author,
        category_id=body.category_id,
        status=ArticleStatus.DRAFT,
        reporter_id=current_user.id,
        location=body.location,
        location_state=body.location_state,
        location_country=body.location_country,
        seo_title=sanitize_plain_text(body.seo_title) if body.seo_title else None,
        meta_description=sanitize_plain_text(body.meta_description) if body.meta_description else None,
        canonical_url=body.canonical_url,
        image_alt_text=sanitize_plain_text(body.image_alt_text) if body.image_alt_text else None,
    )
    db.add(article)
    await db.flush()
    
    # Generate slug after flush so we have ID
    article.slug = body.slug or generate_slug(article.title, article.id)

    # Create workflow tracking record
    workflow = ArticleWorkflow(
        article_id=article.id,
        status=ArticleStatus.DRAFT,
    )
    db.add(workflow)

    await log_audit(
        db,
        action="article:create",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"title": body.title, "category_id": str(body.category_id)},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.reporter),
            selectinload(Article.category),
            selectinload(Article.workflow),
        )
        .where(Article.id == article.id)
    )
    article = result.scalar_one()
    logger.info("Article created by %s: %s (%s)", current_user.email, article.title, article.id)

    return {"success": True, "message": "Article created", "data": _to_response(article)}


@router.get("")
async def list_articles(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    status_filter: ArticleStatus | None = Query(default=None, alias="status"),
    category_id: UUID | None = Query(default=None),
    reporter_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List articles. Reporters see own; editors+ see all."""
    from app.core.rbac import has_permission

    base_query = select(Article).options(
        selectinload(Article.reporter),
        selectinload(Article.category),
        selectinload(Article.workflow),
    ).where(Article.is_deleted == False)
    count_query = select(func.count(Article.id)).where(Article.is_deleted == False)

    # Scope: reporters see only their own articles
    if not has_permission(current_user, "article:view_all"):
        base_query = base_query.where(Article.reporter_id == current_user.id)
        count_query = count_query.where(Article.reporter_id == current_user.id)

    # Filters
    if status_filter:
        base_query = base_query.where(Article.status == status_filter)
        count_query = count_query.where(Article.status == status_filter)
    if category_id:
        base_query = base_query.where(Article.category_id == category_id)
        count_query = count_query.where(Article.category_id == category_id)
    if reporter_id:
        base_query = base_query.where(Article.reporter_id == reporter_id)
        count_query = count_query.where(Article.reporter_id == reporter_id)
    if search:
        pattern = f"%{search}%"
        search_filter = or_(Article.title.ilike(pattern), Article.description.ilike(pattern))
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(
        base_query.order_by(Article.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    articles = [_to_response(a) for a in result.scalars().unique().all()]

    return {"success": True, "message": "Articles retrieved", "data": _paginate(articles, total, page, limit)}


@router.get("/{article_id}")
async def get_article(
    article_id: UUID,
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a single article with workflow state."""
    from app.core.rbac import has_permission

    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.reporter),
            selectinload(Article.category),
            selectinload(Article.workflow),
        )
        .where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Ownership check for reporters
    if not has_permission(current_user, "article:view_all") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    return {"success": True, "message": "Article retrieved", "data": _to_response(article)}


@router.get("/slug/{slug}")
async def get_article_by_slug(
    slug: str,
    current_user: User = Depends(require_permission("article:view_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a single article by slug."""
    from app.core.rbac import has_permission

    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.reporter),
            selectinload(Article.category),
            selectinload(Article.workflow),
        )
        .where(Article.slug == slug, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    if not has_permission(current_user, "article:view_all") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    return {"success": True, "message": "Article retrieved", "data": _to_response(article)}


@router.put("/{article_id}")
async def update_article(
    article_id: UUID,
    body: ArticleUpdateV2,
    request: Request,
    current_user: User = Depends(require_permission("article:edit_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update an article. Reporters edit own; editors edit any."""
    from app.core.rbac import has_permission

    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.reporter),
            selectinload(Article.category),
            selectinload(Article.workflow),
        )
        .where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Ownership check
    if not has_permission(current_user, "article:edit_any") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    if article.status == ArticleStatus.PUBLISHED:
        # Only editors can edit published articles
        if not has_permission(current_user, "article:edit_any"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Published articles can only be edited by editors")
        
        # Create snapshot before editing
        await create_content_snapshot(article, current_user.id, "post_publish_edit", "Post-publish edit", db)
        article.post_publish_edit_count += 1
    elif article.status not in (ArticleStatus.DRAFT, ArticleStatus.REVISION_REQUESTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit article in '{article.status.value}' status",
        )

    changes: dict[str, Any] = {}
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            # --- SEC FIX SEC-010 ---
            if field == "content":
                value = sanitize_article_html(value)
            elif field in {"title", "description", "seo_title", "meta_description", "image_alt_text"}:
                value = sanitize_plain_text(value)
            setattr(article, field, value)
            changes[field] = str(value) if not isinstance(value, (str, int, float, bool, type(None))) else value

    # Verify category if changed
    if body.category_id:
        cat = await db.get(Category, body.category_id)
        if cat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    await log_audit(
        db,
        action="post_publish_edit" if article.status == ArticleStatus.PUBLISHED else "article:update",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes=changes or None,
        ip_address=request.client.host if request.client else None,
    )
    
    if article.status == ArticleStatus.PUBLISHED and article.is_breaking_update:
        # Re-trigger push notification and websocket broadcast
        try:
            body_text = article.meta_description or article.description or ""
            await send_to_all(
                title=f"BREAKING: {article.title[:65]}",
                body=body_text[:120],
                data={"article_id": str(article.id), "slug": str(article.slug), "type": "breaking_update"},
                db=db
            )
            await connection_manager.publish_event({
                "type": "breaking_update",
                "data": {
                    "id": str(article.id),
                    "title": article.title,
                    "slug": article.slug,
                    "is_breaking_update": True,
                }
            })
        except Exception as e:
            logger.error("Failed to send breaking update notifications: %s", e)
    
    await db.commit()
    await db.refresh(article)

    # Reload relationships
    result = await db.execute(
        select(Article)
        .options(
            selectinload(Article.reporter),
            selectinload(Article.category),
            selectinload(Article.workflow),
        )
        .where(Article.id == article.id)
    )
    article = result.scalar_one()

    return {"success": True, "message": "Article updated", "data": _to_response(article)}


@router.post("/{article_id}/correction")
async def add_correction_notice(
    article_id: UUID,
    body: CorrectionNoticeRequest,
    request: Request,
    current_user: User = Depends(require_permission("article:edit_any")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Add a correction notice to a published article (editors only)."""
    result = await db.execute(
        select(Article).options(selectinload(Article.workflow)).where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    if article.status != ArticleStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only correct published articles")

    from datetime import datetime, timezone
    
    await create_content_snapshot(article, current_user.id, "correction", "Correction added", db)
    
    article.correction_notice = body.notice
    article.correction_added_at = datetime.now(timezone.utc)
    article.correction_added_by_id = current_user.id
    
    await log_audit(
        db,
        action="correction_added",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"correction_notice": body.notice},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(article)
    return {"success": True, "message": "Correction notice added", "data": _to_response(article)}


@router.delete("/{article_id}")
async def delete_article(
    article_id: UUID,
    request: Request,
    body: DeleteArticleRequest = Depends(),
    current_user: User = Depends(require_permission("article:delete_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete an article. Only draft articles can be deleted."""
    from app.core.rbac import has_permission

    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Ownership check
    if not has_permission(current_user, "article:delete_any") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    if article.status != ArticleStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft articles can be deleted",
        )

    await log_audit(
        db,
        action="article:delete",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"title": article.title, "reason": body.reason},
        ip_address=request.client.host if request.client else None,
    )
    from datetime import datetime, timezone
    article.is_deleted = True
    article.deleted_at = datetime.now(timezone.utc)
    article.deleted_by_id = current_user.id
    article.delete_reason = body.reason
    await db.commit()

    return {"success": True, "message": "Article deleted"}


@router.post("/{article_id}/restore")
async def restore_article(
    article_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("article:delete_any")), # Requires admin-like permission
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Restore a soft-deleted article."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can restore articles")

    result = await db.execute(select(Article).options(selectinload(Article.workflow)).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.is_deleted = False
    article.deleted_at = None
    article.deleted_by_id = None
    article.delete_reason = None

    await log_audit(
        db,
        action="article:restore",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(article)
    return {"success": True, "message": "Article restored", "data": _to_response(article)}


@router.patch("/{article_id}/tags")
async def set_article_tags(
    article_id: UUID,
    body: ArticleTagsUpdate,
    request: Request,
    current_user: User = Depends(require_permission("article:edit_own")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Replace all tags on an article."""
    from app.core.rbac import has_permission
    from app.models.tag import Tag, article_tags

    result = await db.execute(
        select(Article).options(selectinload(Article.tags)).where(Article.id == article_id, Article.is_deleted == False)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    if not has_permission(current_user, "article:edit_any") and article.reporter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your article")

    # Verify all tag IDs exist
    if body.tag_ids:
        tags_result = await db.execute(select(Tag).where(Tag.id.in_(body.tag_ids)))
        tags = list(tags_result.scalars().all())
        if len(tags) != len(body.tag_ids):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more tags not found")
    else:
        tags = []

    article.tags = tags

    await log_audit(
        db,
        action="article:set_tags",
        resource_type="article",
        user_id=current_user.id,
        resource_id=article.id,
        changes={"tag_ids": [str(t.id) for t in tags]},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    tag_data = [{"id": str(t.id), "name": t.name, "slug": t.slug} for t in tags]
    return {"success": True, "message": "Tags updated", "data": tag_data}
