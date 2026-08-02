"""Article business logic and helper functions."""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.article_workflow import ArticleRevision


# --- FIX 3: SEO AND SLUG FIELDS ---
def generate_slug(title: str, article_id: str | UUID) -> str:
    """
    Convert title to URL-safe slug.
    Lowercase, replace spaces with hyphens, strip special chars.
    Append first 8 chars of article_id to guarantee uniqueness.
    Example: 'Nigeria Wins AFCON 2026!' -> 'nigeria-wins-afcon-2026-a1b2c3d4'
    """
    slug_base = title.lower()
    slug_base = re.sub(r"[^a-z0-9\s-]", "", slug_base)
    slug_base = re.sub(r"[\s-]+", "-", slug_base).strip("-")
    
    id_prefix = str(article_id)[:8]
    if slug_base:
        return f"{slug_base}-{id_prefix}"
    return id_prefix


# --- FIX 9: VERSION HISTORY AND CONTENT DIFFS ---
async def create_content_snapshot(
    article: Article,
    editor_id: UUID,
    revision_type: str,
    change_summary: str | None,
    db: AsyncSession,
) -> ArticleRevision:
    """
    Snapshot the current article title and body content into ArticleRevision.
    Call this BEFORE saving any edit so the snapshot captures the pre-edit state.
    """
    if article.workflow is None:
        raise ValueError("Article has no workflow record")

    revision = ArticleRevision(
        workflow_id=article.workflow.id,
        reviewer_id=editor_id,
        action=revision_type,
        from_status=article.status.value,
        to_status=article.status.value,
        comments=change_summary,
        revision_type=revision_type,
        title_snapshot=article.title,
        content_snapshot=article.content,
    )
    db.add(revision)
    return revision
