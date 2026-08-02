"""RSS Feed generation endpoints."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.dependencies_v2 import get_db
from app.models.article import Article
from app.models.category import Category
from app.models.enums import ArticleStatus
from app.services.sanitization_service import sanitize_plain_text

settings = get_settings()
router = APIRouter(prefix="/rss", tags=["RSS"])


def _build_rss_xml(articles: list[Article], category_name: str | None = None) -> bytes:
    """Build RSS 2.0 XML from articles."""
    rss = ET.Element("rss", version="2.0")
    channel = ET.SubElement(rss, "channel")

    title_text = "Daily News Hub"
    if category_name:
        title_text += f" - {category_name}"

    ET.SubElement(channel, "title").text = title_text
    ET.SubElement(channel, "link").text = settings.APP_BASE_URL or "http://localhost:8000"
    ET.SubElement(channel, "description").text = "Breaking news, latest stories, and in-depth coverage"
    ET.SubElement(channel, "language").text = "en-ng"
    
    # Use most recent article's date as lastBuildDate
    last_build_date = datetime.now(timezone.utc)
    if articles and articles[0].published_at:
        last_build_date = articles[0].published_at
    ET.SubElement(channel, "lastBuildDate").text = format_datetime(last_build_date)
    
    managing_editor = getattr(settings, "RSS_EDITOR_EMAIL", "editor@dailynewshub.com")
    ET.SubElement(channel, "managingEditor").text = managing_editor

    for article in articles:
        item = ET.SubElement(channel, "item")
        
        ET.SubElement(item, "title").text = article.title
        
        link_url = f"{settings.APP_BASE_URL}/articles/{article.slug or str(article.id)}"
        ET.SubElement(item, "link").text = link_url
        
        # --- SEC FIX SEC-010 ---
        desc = sanitize_plain_text(getattr(article, "meta_description", None) or article.description or "")
        ET.SubElement(item, "description").text = escape(desc)
        
        pub_date = article.published_at or article.created_at
        ET.SubElement(item, "pubDate").text = format_datetime(pub_date)
        
        author_name = article.author or managing_editor
        ET.SubElement(item, "author").text = author_name
        
        if hasattr(article, "category") and article.category:
            ET.SubElement(item, "category").text = article.category.name
            
        ET.SubElement(item, "guid", isPermaLink="false").text = str(article.id)
        
        if article.image_url:
            ET.SubElement(item, "enclosure", url=article.image_url, type="image/jpeg", length="0")
            
    return ET.tostring(rss, encoding="utf-8", xml_declaration=True)


@router.get("")
async def get_rss_feed(db: AsyncSession = Depends(get_db)) -> Response:
    """Get the global RSS feed."""
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.category))
        .where(Article.status == ArticleStatus.PUBLISHED, Article.is_deleted == False)
        .order_by(Article.published_at.desc().nullslast())
        .limit(50)
    )
    articles = list(result.scalars().all())
    
    xml_content = _build_rss_xml(articles)
    return Response(content=xml_content, media_type="application/rss+xml; charset=utf-8")


@router.get("/{category_slug}")
async def get_rss_feed_by_category(category_slug: str, db: AsyncSession = Depends(get_db)) -> Response:
    """Get the RSS feed for a specific category."""
    cat_res = await db.execute(select(Category).where(Category.slug == category_slug))
    category = cat_res.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.category))
        .where(
            Article.category_id == category.id,
            Article.status == ArticleStatus.PUBLISHED,
            Article.is_deleted == False
        )
        .order_by(Article.published_at.desc().nullslast())
        .limit(50)
    )
    articles = list(result.scalars().all())
    
    xml_content = _build_rss_xml(articles, category.name)
    return Response(content=xml_content, media_type="application/rss+xml; charset=utf-8")
