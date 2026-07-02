"""Currents API news ingestion service."""

from __future__ import annotations

import re
import unicodedata
import logging
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.cache import bump_version
from app.db.session import AsyncSessionLocal
from app.models.article import Article
from app.models.category import Category
from app.models.notification import Notification
from app.schemas.article import ArticleResponse
from app.services import push_notification
from app.websocket.connection_manager import connection_manager

settings = get_settings()
logger = logging.getLogger(__name__)


CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "technology": ["tech", "technology", "ai", "software", "app", "digital"],
    "business": ["business", "market", "economy", "finance", "bank", "startup"],
    "sports": ["sports", "football", "basketball", "soccer", "tennis", "cricket"],
    "health": ["health", "medical", "medicine", "wellness", "fitness"],
    "science": ["science", "research", "space", "physics", "biology"],
    "politics": ["politics", "government", "election", "policy", "senate"],
    "entertainment": ["entertainment", "movie", "music", "tv", "film", "celebrity"],
    "environment": ["environment", "climate", "weather", "green", "sustainability"],
    "agriculture": ["agriculture", "farming", "farm", "crop", "rural"],
    "economy": ["economy", "economic", "inflation", "recession"],
    "food": ["food", "recipe", "restaurant", "cuisine"],
}
NULL_STRINGS = {"none", "null", "undefined", "nan", ""}
LOW_QUALITY_KEYWORDS = {
    "obituary",
    "obituaries",
    "obits",
    "legacy",
    "death notice",
    "death notices",
    "funeral",
    "memorial",
}


def slugify(value: str) -> str:
    """Convert a string to a stable URL-friendly slug."""

    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "general"


def _normalize_text(value: Any) -> str | None:
    """Normalize null-like strings and trim textual values."""

    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.lower() in NULL_STRINGS:
            return None
        return stripped
    return str(value).strip() or None


def _normalize_source_name(article_data: dict[str, Any]) -> str | None:
    """Extract a clean source name from a variety of upstream payload shapes."""

    source_value = article_data.get("source_name")
    if isinstance(source_value, dict):
        normalized = _normalize_text(source_value.get("name") or source_value.get("title"))
        if normalized:
            return normalized

    normalized = _normalize_text(source_value or article_data.get("source") or article_data.get("sourceName"))
    if normalized:
        return normalized

    source_url = _normalize_text(article_data.get("url") or article_data.get("source_url") or article_data.get("sourceUrl"))
    return _derive_source_name_from_url(source_url)


def _derive_source_name_from_url(source_url: str | None) -> str | None:
    """Generate a readable source name from the article URL host."""

    if not source_url:
        return None

    parsed = urlparse(source_url)
    host = parsed.netloc.lower()
    if not host:
        return None

    host = host.removeprefix("www.")
    host = host.split(":")[0]

    friendly_map = {
        "bbc.co.uk": "BBC",
        "bbc.com": "BBC",
        "theverge.com": "The Verge",
        "abc.net.au": "ABC News",
        "apnews.com": "Associated Press",
        "reuters.com": "Reuters",
        "fox40.com": "FOX40",
        "fool.com.au": "The Motley Fool",
        "winnipegfreepress.com": "Winnipeg Free Press",
    }
    for domain, label in friendly_map.items():
        if host == domain or host.endswith(f".{domain}"):
            return label

    parts = [part for part in host.split(".") if part and part not in {"com", "net", "org", "co", "uk", "au", "us"}]
    if not parts:
        return None
    if len(parts) == 1:
        return " ".join(word.capitalize() for word in parts[0].replace("-", " ").split())

    return " ".join(word.capitalize() for word in " ".join(parts[-2:]).replace("-", " ").split())


def _is_low_quality_article(article_data: dict[str, Any]) -> bool:
    """Reject clearly irrelevant or obituary-style articles."""

    text = " ".join(
        _normalize_text(article_data.get(field)) or ""
        for field in ("title", "description", "content", "source_name", "source")
    ).lower()
    source_url = (_normalize_text(article_data.get("url")) or _normalize_text(article_data.get("source_url")) or _normalize_text(article_data.get("sourceUrl")) or "").lower()
    return any(keyword in text for keyword in LOW_QUALITY_KEYWORDS) or "/obits/" in source_url or "legacy" in source_url


def _extract_article_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract article records from a Currents API response payload."""

    for key in ("news", "articles", "data"):
        items = payload.get(key)
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    return []


def _guess_category_name(article_data: dict[str, Any]) -> str:
    """Infer a category name from article metadata."""

    candidates: list[str] = []
    category_value = article_data.get("category")
    if isinstance(category_value, str):
        candidates.append(category_value)
    elif isinstance(category_value, list):
        candidates.extend(str(item) for item in category_value if item)

    text = " ".join((_normalize_text(article_data.get(field)) or "").lower() for field in ("title", "description", "content"))
    for category_name, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            candidates.append(category_name)
            break

    return candidates[0] if candidates else "general"


async def _get_or_create_category(session: AsyncSession, article_data: dict[str, Any]) -> tuple[Category, bool]:
    """Resolve or create a category for an ingested article."""

    category_name = _guess_category_name(article_data).strip() or "general"
    slug = slugify(category_name)

    result = await session.execute(select(Category).where(Category.slug == slug))
    category = result.scalar_one_or_none()
    if category:
        return category, False

    category = Category(name=category_name.title(), slug=slug, icon=article_data.get("icon"))
    session.add(category)
    await session.flush()
    return category, True


def _parse_published_at(article_data: dict[str, Any]) -> datetime | None:
    """Parse a published timestamp from article metadata."""

    for key in ("published", "published_at", "pubDate", "date"):
        raw_value = article_data.get(key)
        if not raw_value:
            continue
        if isinstance(raw_value, datetime):
            return raw_value
        if isinstance(raw_value, str):
            try:
                return datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
            except ValueError:
                continue
    return datetime.now(timezone.utc)


def _serialize_article(article: Article) -> dict[str, Any]:
    """Serialize an ORM article for WebSocket broadcasting."""

    return ArticleResponse.model_validate(article).model_dump(mode="json")


async def fetch_and_save_articles() -> list[Article]:
    """Fetch the latest news and persist non-duplicate articles."""

    async with AsyncSessionLocal() as session:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{settings.CURRENTS_API_URL.rstrip('/')}/latest-news",
                    params={"apiKey": settings.CURRENTS_API_KEY, "language": "en"},
                )
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError as exc:
            logger.warning("Currents API fetch failed: %s", exc)
            return []

        items = _extract_article_items(payload)
        new_articles: list[Article] = []
        created_categories = False
        seen_source_urls: set[str] = set()

        try:
            for raw_article in items:
                if _is_low_quality_article(raw_article):
                    continue

                source_url = _normalize_text(raw_article.get("url") or raw_article.get("source_url") or raw_article.get("sourceUrl"))
                title = _normalize_text(raw_article.get("title") or raw_article.get("headline")) or "Untitled article"
                if not source_url:
                    continue

                normalized_source_url = source_url
                if normalized_source_url in seen_source_urls:
                    continue
                seen_source_urls.add(normalized_source_url)

                existing_article = await session.scalar(select(Article.id).where(Article.source_url == normalized_source_url))
                if existing_article:
                    continue

                category, category_created = await _get_or_create_category(session, raw_article)
                created_categories = created_categories or category_created
                article = Article(
                    title=title,
                    description=_normalize_text(raw_article.get("description") or raw_article.get("summary")),
                    content=_normalize_text(raw_article.get("content") or raw_article.get("body")),
                    image_url=_normalize_text(raw_article.get("image") or raw_article.get("image_url")),
                    source_name=_normalize_source_name(raw_article),
                    source_url=normalized_source_url,
                    author=_normalize_text(raw_article.get("author")),
                    category_id=category.id,
                    is_featured=bool(raw_article.get("is_featured", False)),
                    is_trending=bool(raw_article.get("is_trending", False)),
                    published_at=_parse_published_at(raw_article),
                )
                session.add(article)
                new_articles.append(article)

            await session.commit()
            for article in new_articles:
                await session.refresh(article)
        except Exception:
            await session.rollback()
            raise

        if new_articles:
            event = {
                "type": "new_articles",
                "count": len(new_articles),
                "items": [_serialize_article(article) for article in new_articles],
            }
            await connection_manager.broadcast(event)
            await connection_manager.publish_event(event)

            redis_client = connection_manager.redis_client
            close_client = False
            if redis_client is None:
                redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                close_client = True
            try:
                await bump_version(redis_client, "articles")
                if created_categories:
                    await bump_version(redis_client, "categories")
            finally:
                if close_client:
                    await redis_client.aclose()

            await push_notification.send_to_all(
                title="New articles available",
                body=f"{len(new_articles)} new articles were added to Daily News Hub.",
            )

            notification = Notification(
                title="New articles available",
                body=f"{len(new_articles)} new articles were added to Daily News Hub.",
                sent_at=datetime.now(timezone.utc),
            )
            session.add(notification)
            await session.commit()
            await session.refresh(notification)
            await connection_manager.broadcast(
                {
                    "type": "notification",
                    "notification_id": str(notification.id),
                    "title": notification.title,
                    "body": notification.body,
                    "article_id": None,
                    "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
                }
            )

        return new_articles


async def cleanup_existing_articles(db: AsyncSession | None = None) -> int:
    """Normalize existing article rows and remove obvious low-quality records."""

    owns_session = db is None
    session = db or AsyncSessionLocal()
    cleaned = 0

    try:
        result = await session.execute(select(Article))
        articles = result.scalars().all()

        for article in articles:
            should_delete = _is_low_quality_article(
                {
                    "title": article.title,
                    "description": article.description,
                    "content": article.content,
                    "source_name": article.source_name,
                    "source": article.source_name,
                    "url": article.source_url,
                }
            )
            if should_delete:
                await session.delete(article)
                cleaned += 1
                continue

            updated = False
            for field in ("description", "content", "image_url", "source_name", "author"):
                current_value = getattr(article, field)
                normalized_value = _normalize_text(current_value)
                if field == "source_name" and not normalized_value:
                    normalized_value = _derive_source_name_from_url(article.source_url)
                if current_value != normalized_value:
                    setattr(article, field, normalized_value)
                    updated = True

            if updated:
                cleaned += 1

        await session.commit()
        return cleaned
    except Exception:
        await session.rollback()
        raise
    finally:
        if owns_session:
            await session.close()
