"""Bookmark management routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.article import Article
from app.models.bookmark import Bookmark
from app.models.user import User
from app.schemas.article import ArticleResponse
from app.schemas.bookmark import BookmarkResponse


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
    return {
        "success": True,
        "message": "Bookmark removed successfully",
        "data": BookmarkResponse.model_validate(bookmark).model_dump(mode="json"),
    }
