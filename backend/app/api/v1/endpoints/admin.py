"""Admin-only management routes."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import bump_version
from app.core.dependencies import get_current_admin, get_db
from app.models.article import Article
from app.models.category import Category
from app.models.notification import Notification
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleUpdate
from app.schemas.notification import SendNotificationRequest
from app.schemas.user import UserResponse, UserUpdate
from app.services.analytics import get_analytics
from app.services.push_notification import send_to_all
from app.websocket.connection_manager import connection_manager


router = APIRouter(prefix="/admin", tags=["admin"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    """Serialize a paginated collection response."""

    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


@router.get("/users")
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List users with pagination."""

    total = int(await db.scalar(select(func.count(User.id))) or 0)
    result = await db.execute(select(User).order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit))
    users = [UserResponse.model_validate(user).model_dump(mode="json") for user in result.scalars().all()]
    return {"success": True, "message": "Users retrieved successfully", "data": _paginate(users, total, page, limit)}


@router.put("/users/{user_id}")
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Update a user account as an admin."""

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data:
        duplicate = await db.scalar(select(User).where(User.email == update_data["email"], User.id != user_id))
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    password = update_data.pop("password", None)
    if password:
        from app.core.security import get_password_hash

        user.password_hash = get_password_hash(password)

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return {"success": True, "message": "User updated successfully", "data": UserResponse.model_validate(user).model_dump(mode="json")}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete a user account as an admin."""

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"success": True, "message": "User deleted successfully", "data": {"id": str(user_id)}}


@router.get("/articles")
async def list_articles(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List articles with pagination."""

    total = int(await db.scalar(select(func.count(Article.id))) or 0)
    result = await db.execute(select(Article).order_by(Article.created_at.desc()).offset((page - 1) * limit).limit(limit))
    articles = [ArticleResponse.model_validate(article).model_dump(mode="json") for article in result.scalars().all()]
    return {"success": True, "message": "Articles retrieved successfully", "data": _paginate(articles, total, page, limit)}


@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: ArticleCreate,
    request: Request,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Create a new article as an admin."""

    category = await db.get(Category, payload.category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    existing = await db.scalar(select(Article).where(Article.source_url == payload.source_url))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Article already exists")

    article = Article(**payload.model_dump())
    db.add(article)
    await db.commit()
    await db.refresh(article)
    await bump_version(getattr(request.app.state, "redis", None), "articles")
    return {"success": True, "message": "Article created successfully", "data": ArticleResponse.model_validate(article).model_dump(mode="json")}


@router.put("/articles/{article_id}")
async def update_article(
    article_id: UUID,
    payload: ArticleUpdate,
    request: Request,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Update an existing article."""

    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        category = await db.get(Category, update_data["category_id"])
        if category is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if "source_url" in update_data:
        duplicate = await db.scalar(select(Article).where(Article.source_url == update_data["source_url"], Article.id != article_id))
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Article already exists")

    for key, value in update_data.items():
        setattr(article, key, value)

    await db.commit()
    await db.refresh(article)
    await bump_version(getattr(request.app.state, "redis", None), "articles")
    return {"success": True, "message": "Article updated successfully", "data": ArticleResponse.model_validate(article).model_dump(mode="json")}


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: UUID,
    request: Request,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete an article."""

    article = await db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    await db.delete(article)
    await db.commit()
    await bump_version(getattr(request.app.state, "redis", None), "articles")
    return {"success": True, "message": "Article deleted successfully", "data": {"id": str(article_id)}}


@router.get("/analytics")
async def analytics(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return aggregated admin analytics."""

    data = await get_analytics(db)
    return {"success": True, "message": "Analytics retrieved successfully", "data": data}


@router.post("/notifications/send")
async def send_notification(
    payload: SendNotificationRequest,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Send a push notification to all device tokens and store the event."""

    if payload.article_id is not None:
        article = await db.get(Article, payload.article_id)
        if article is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    sent_count = await send_to_all(title=payload.title, body=payload.body, db=db)
    notification = Notification(
        title=payload.title,
        body=payload.body,
        article_id=payload.article_id,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    await connection_manager.broadcast(
        {
            "type": "notification",
            "notification_id": str(notification.id),
            "title": notification.title,
            "body": notification.body,
            "article_id": str(notification.article_id) if notification.article_id else None,
            "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
        }
    )
    return {
        "success": True,
        "message": "Notification dispatched successfully",
        "data": {"notification_id": str(notification.id), "sent_count": sent_count},
    }
