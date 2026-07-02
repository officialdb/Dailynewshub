"""Article browsing routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import build_versioned_key, get_json, normalize_cache_fragment, set_json
from app.core.dependencies import get_current_user, get_db
from app.core.rate_limit import enforce_rate_limit
from app.models.article import Article
from app.models.category import Category
from app.models.comment import Comment
from app.models.user import User
from app.schemas.article import ArticleResponse, PaginatedArticleResponse
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.category import CategoryResponse


router = APIRouter(prefix="/articles", tags=["articles"])


def _paginate_articles(items: list[Article], total: int, page: int, limit: int) -> dict[str, object]:
    """Format article rows into the standard paginated response structure."""

    pages = (total + limit - 1) // limit if total else 0
    return PaginatedArticleResponse(
        items=[ArticleResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    ).model_dump(mode="json")


def _serialize_comment(comment: Comment) -> dict[str, object]:
    """Serialize a comment ORM object into the public API shape."""

    return CommentResponse.model_validate(comment).model_dump(mode="json")


async def _get_category_by_slug(request: Request, db: AsyncSession, slug: str) -> dict[str, object] | None:
    """Resolve a category by slug with a short-lived Redis cache."""

    redis_client = getattr(request.app.state, "redis", None)
    cache_key = await build_versioned_key(redis_client, "categories", f"slug:{normalize_cache_fragment(slug)}")
    cached = await get_json(redis_client, cache_key)
    if cached is not None:
        return cached

    category = await db.scalar(select(Category).where(Category.slug == slug))
    if category is None:
        return None

    payload = CategoryResponse.model_validate(category).model_dump(mode="json")
    await set_json(redis_client, cache_key, payload, ttl_seconds=300)
    return payload


@router.get("")
async def list_articles(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return a paginated list of published articles."""

    await enforce_rate_limit(request, scope="articles:list", limit=120, window_seconds=60)
    redis_client = getattr(request.app.state, "redis", None)
    cache_key = await build_versioned_key(redis_client, "articles", "list", f"page:{page}", f"limit:{limit}")
    cached = await get_json(redis_client, cache_key)
    if cached is not None:
        return {"success": True, "message": "Articles retrieved successfully", "data": cached}

    total = int(await db.scalar(select(func.count(Article.id))) or 0)
    result = await db.execute(
        select(Article)
        .order_by(Article.is_trending.desc(), Article.published_at.desc().nullslast(), Article.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    articles = result.scalars().all()
    payload = _paginate_articles(articles, total, page, limit)
    await set_json(redis_client, cache_key, payload, ttl_seconds=60)
    return {"success": True, "message": "Articles retrieved successfully", "data": payload}


@router.get("/trending")
async def trending_articles(
    request: Request,
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return the most viewed articles."""

    await enforce_rate_limit(request, scope="articles:trending", limit=120, window_seconds=60)
    redis_client = getattr(request.app.state, "redis", None)
    cache_key = await build_versioned_key(redis_client, "articles", "trending", f"limit:{limit}")
    cached = await get_json(redis_client, cache_key)
    if cached is not None:
        return {"success": True, "message": "Trending articles retrieved successfully", "data": cached}

    result = await db.execute(
        select(Article).order_by(Article.view_count.desc(), Article.published_at.desc().nullslast()).limit(limit)
    )
    items = result.scalars().all()
    payload = [ArticleResponse.model_validate(item).model_dump(mode="json") for item in items]
    await set_json(redis_client, cache_key, payload, ttl_seconds=30)
    return {
        "success": True,
        "message": "Trending articles retrieved successfully",
        "data": payload,
    }


@router.get("/category/{slug}")
async def articles_by_category(
    request: Request,
    slug: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return a paginated list of articles for one category slug."""

    await enforce_rate_limit(request, scope="articles:category", limit=120, window_seconds=60)
    redis_client = getattr(request.app.state, "redis", None)
    category = await _get_category_by_slug(request, db, slug)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    cache_key = await build_versioned_key(
        redis_client,
        "articles",
        "category",
        normalize_cache_fragment(slug),
        f"page:{page}",
        f"limit:{limit}",
    )
    cached = await get_json(redis_client, cache_key)
    if cached is not None:
        return {
            "success": True,
            "message": "Category articles retrieved successfully",
            "data": cached,
        }

    total = int(await db.scalar(select(func.count(Article.id)).where(Article.category_id == category["id"])) or 0)
    result = await db.execute(
        select(Article)
        .where(Article.category_id == category["id"])
        .order_by(Article.published_at.desc().nullslast(), Article.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    articles = result.scalars().all()
    payload = _paginate_articles(articles, total, page, limit)
    await set_json(redis_client, cache_key, payload, ttl_seconds=60)
    return {
        "success": True,
        "message": "Category articles retrieved successfully",
        "data": payload,
    }


@router.get("/search")
async def search_articles(
    request: Request,
    q: str = Query(min_length=1),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Search articles by title and description."""

    await enforce_rate_limit(request, scope="articles:search", limit=30, window_seconds=60)
    redis_client = getattr(request.app.state, "redis", None)
    cache_key = await build_versioned_key(
        redis_client,
        "articles",
        "search",
        normalize_cache_fragment(q),
        f"page:{page}",
        f"limit:{limit}",
    )
    cached = await get_json(redis_client, cache_key)
    if cached is not None:
        return {"success": True, "message": "Search results retrieved successfully", "data": cached}

    pattern = f"%{q}%"
    total = int(
        await db.scalar(
            select(func.count(Article.id)).where(or_(Article.title.ilike(pattern), Article.description.ilike(pattern)))
        )
        or 0
    )
    result = await db.execute(
        select(Article)
        .where(or_(Article.title.ilike(pattern), Article.description.ilike(pattern)))
        .order_by(Article.published_at.desc().nullslast(), Article.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    articles = result.scalars().all()
    payload = _paginate_articles(articles, total, page, limit)
    await set_json(redis_client, cache_key, payload, ttl_seconds=60)
    return {
        "success": True,
        "message": "Search results retrieved successfully",
        "data": payload,
    }


@router.get("/{article_id}/comments")
async def list_comments(article_id: UUID, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    """Return comments attached to one article."""

    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.article_id == article_id)
        .order_by(Comment.created_at.desc())
    )
    comments = result.scalars().all()
    payload = [_serialize_comment(comment) for comment in comments]
    return {"success": True, "message": "Comments retrieved successfully", "data": payload}


@router.post("/{article_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    article_id: UUID,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Create a new comment on an article."""

    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment body cannot be empty")

    comment = Comment(article_id=article_id, user_id=current_user.id, body=body)
    db.add(comment)
    await db.flush()
    comment_id = comment.id
    await db.commit()

    result = await db.execute(
        select(Comment).options(selectinload(Comment.user)).where(Comment.id == comment_id)
    )
    created_comment = result.scalar_one()
    return {
        "success": True,
        "message": "Comment added successfully",
        "data": _serialize_comment(created_comment),
    }


@router.get("/{article_id}")
async def get_article(article_id: UUID, db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    """Return a single article and increment its view count."""

    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    await db.execute(update(Article).where(Article.id == article_id).values(view_count=Article.view_count + 1))
    await db.commit()
    await db.refresh(article)
    return {
        "success": True,
        "message": "Article retrieved successfully",
        "data": ArticleResponse.model_validate(article).model_dump(mode="json"),
    }
