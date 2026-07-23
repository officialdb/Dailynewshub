"""Bookmark management routes."""


from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.article import Article
from app.models.bookmark import Bookmark
from app.models.user import User
from app.models.reel import Reel
from app.schemas.article import ArticleResponse
from app.schemas.bookmark import BookmarkResponse
from app.schemas.reel import ReelResponse


router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("")
async def list_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return the current user's bookmarks."""

    result = await db.execute(select(Bookmark).where(Bookmark.user_id == current_user.id).order_by(Bookmark.created_at.desc()))
    bookmarks = result.scalars().all()
    return {
        "success": True,
        "message": "Bookmarks retrieved successfully",
        "data": [BookmarkResponse.model_validate(bookmark).model_dump(mode="json") for bookmark in bookmarks],
    }


@router.get("/articles")
async def list_bookmarked_articles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return the current user's bookmarked articles."""

    result = await db.execute(
        select(Article)
        .join(Bookmark, Bookmark.article_id == Article.id)
        .where(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
    )
    articles = result.scalars().all()
    return {
        "success": True,
        "message": "Bookmarked articles retrieved successfully",
        "data": [ArticleResponse.model_validate(article).model_dump(mode="json") for article in articles],
    }


@router.post("/{article_id}", status_code=status.HTTP_201_CREATED)
async def add_bookmark(
    article_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Bookmark an article for the current user."""

    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    existing = await db.scalar(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.article_id == article_id)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bookmark already exists")

    bookmark = Bookmark(user_id=current_user.id, article_id=article_id)
    db.add(bookmark)
    await db.commit()
    await db.refresh(bookmark)
    return {
        "success": True,
        "message": "Bookmark added successfully",
        "data": BookmarkResponse.model_validate(bookmark).model_dump(mode="json"),
    }


@router.delete("/{article_id}")
async def remove_bookmark(
    article_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Remove a bookmark for the current user."""

    bookmark = await db.scalar(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.article_id == article_id)
    )
    if bookmark is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found")

    await db.delete(bookmark)
    await db.commit()
    return {"success": True, "message": "Bookmark removed successfully", "data": {"article_id": str(article_id)}}


@router.get("/reels")
async def list_reel_bookmarks(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return paginated list of bookmarked reels for the current user."""
    total = int(
        await db.scalar(
            select(func.count(Bookmark.id)).where(Bookmark.user_id == current_user.id, Bookmark.reel_id.isnot(None))
        )
        or 0
    )
    result = await db.execute(
        select(Bookmark)
        .options(selectinload(Bookmark.reel))
        .where(Bookmark.user_id == current_user.id, Bookmark.reel_id.isnot(None))
        .order_by(Bookmark.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    bookmarks = result.scalars().all()
    
    items = []
    for b in bookmarks:
        if b.reel:
            r_dict = ReelResponse.model_validate(b.reel).model_dump(mode="json")
            r_dict["is_bookmarked"] = True
            items.append(r_dict)
            
    pages = (total + limit - 1) // limit if total else 0
    return {
        "success": True,
        "message": "Reel bookmarks retrieved successfully",
        "data": {"items": items, "total": total, "page": page, "limit": limit, "pages": pages},
    }


@router.post("/reels/{reel_id}", status_code=status.HTTP_201_CREATED)
async def add_reel_bookmark(
    reel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Bookmark a reel."""
    reel = await db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")

    existing = await db.scalar(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.reel_id == reel_id)
    )
    if existing:
        return {"success": True, "message": "Reel already bookmarked", "data": {"reel_id": str(reel_id)}}

    bookmark = Bookmark(user_id=current_user.id, reel_id=reel_id)
    db.add(bookmark)
    await db.commit()

    return {"success": True, "message": "Reel bookmarked successfully", "data": {"reel_id": str(reel_id)}}


@router.delete("/reels/{reel_id}")
async def remove_reel_bookmark(
    reel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Remove a reel bookmark."""
    bookmark = await db.scalar(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.reel_id == reel_id)
    )
    if not bookmark:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found")

    await db.delete(bookmark)
    await db.commit()

    return {"success": True, "message": "Reel bookmark removed successfully", "data": {"reel_id": str(reel_id)}}
