"""Admin-only management routes."""


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
from app.schemas.user import UserCreate, UserResponse, UserUpdate
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
    search: str = Query(default="", max_length=200),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List users with pagination and optional search by name or email."""

    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        pattern = f"%{search}%"
        query = query.where(User.name.ilike(pattern) | User.email.ilike(pattern))
        count_query = count_query.where(User.name.ilike(pattern) | User.email.ilike(pattern))

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit))
    users = [UserResponse.model_validate(user).model_dump(mode="json") for user in result.scalars().all()]
    return {"success": True, "message": "Users retrieved successfully", "data": _paginate(users, total, page, limit)}


class AdminUserCreate(UserCreate):
    """Extended user creation schema for admin — allows setting role and status."""
    is_admin: bool = False
    is_active: bool = True


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Create a new user account as an admin."""

    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    from app.core.security import get_password_hash

    user = User(
        name=payload.name,
        email=payload.email,
        avatar_url=payload.avatar_url,
        password_hash=get_password_hash(payload.password),
        is_admin=payload.is_admin,
        is_active=payload.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"success": True, "message": "User created successfully", "data": UserResponse.model_validate(user).model_dump(mode="json")}


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
    search: str = Query(default="", max_length=200),
    category_id: str = Query(default=""),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List articles with pagination, search, and category filter."""

    query = select(Article)
    count_query = select(func.count(Article.id))

    if search:
        pattern = f"%{search}%"
        query = query.where(Article.title.ilike(pattern) | Article.source_name.ilike(pattern))
        count_query = count_query.where(Article.title.ilike(pattern) | Article.source_name.ilike(pattern))

    if category_id:
        query = query.where(Article.category_id == category_id)
        count_query = count_query.where(Article.category_id == category_id)

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(query.order_by(Article.created_at.desc()).offset((page - 1) * limit).limit(limit))
    articles = [ArticleResponse.model_validate(article).model_dump(mode="json") for article in result.scalars().all()]
    return {"success": True, "message": "Articles retrieved successfully", "data": _paginate(articles, total, page, limit)}


@router.get("/articles/{article_id}")
async def get_article(
    article_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Get a single article by ID."""
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return {"success": True, "message": "Article retrieved", "data": ArticleResponse.model_validate(article).model_dump(mode="json")}


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


@router.get("/activity")
async def recent_activity(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return recent activity feed: latest users, articles, and comments."""

    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = [
        {"id": str(u.id), "name": u.name, "email": u.email, "created_at": u.created_at.isoformat()}
        for u in recent_users_result.scalars().all()
    ]

    recent_articles_result = await db.execute(
        select(Article).order_by(Article.created_at.desc()).limit(5)
    )
    recent_articles = [
        {"id": str(a.id), "title": a.title, "source_name": a.source_name, "created_at": a.created_at.isoformat()}
        for a in recent_articles_result.scalars().all()
    ]

    recent_comments_result = await db.execute(
        select(Comment).order_by(Comment.created_at.desc()).limit(5)
    )
    recent_comments = [
        {
            "id": str(c.id),
            "body": c.body[:100],
            "article_title": c.article.title if c.article else None,
            "user_name": c.user_name,
            "created_at": c.created_at.isoformat(),
        }
        for c in recent_comments_result.scalars().all()
    ]

    return {
        "success": True,
        "data": {
            "recent_users": recent_users,
            "recent_articles": recent_articles,
            "recent_comments": recent_comments,
        },
    }


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

# --- NEW ADDITION ---

from app.schemas.notification import ScheduleNotificationRequest
from app.models.reel import Reel
from app.schemas.reel import ReelResponse

@router.put("/articles/{id}/pin")
async def pin_article(
    id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Toggle article is_pinned state."""
    article = await db.get(Article, id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        
    article.is_pinned = not article.is_pinned
    await db.commit()
    await db.refresh(article)
    
    return {"success": True, "message": "Article pin toggled", "data": ArticleResponse.model_validate(article).model_dump(mode="json")}


@router.get("/reels")
async def admin_list_reels(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List reels with pagination for admin."""
    total = int(await db.scalar(select(func.count(Reel.id))) or 0)
    result = await db.execute(select(Reel).order_by(Reel.created_at.desc()).offset((page - 1) * limit).limit(limit))
    reels = [ReelResponse.model_validate(r).model_dump(mode="json") for r in result.scalars().all()]
    return {"success": True, "message": "Reels retrieved successfully", "data": _paginate(reels, total, page, limit)}


@router.delete("/reels/{id}")
async def delete_reel(
    id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete a reel."""
    reel = await db.get(Reel, id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")
        
    await db.delete(reel)
    await db.commit()
    return {"success": True, "message": "Reel deleted", "data": {"id": str(id)}}


@router.post("/notifications/schedule", status_code=status.HTTP_201_CREATED)
async def schedule_notification(
    payload: ScheduleNotificationRequest,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Schedule a notification for a future time."""
    if payload.article_id:
        article = await db.get(Article, payload.article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
            
    notification = Notification(
        title=payload.title,
        body=payload.body,
        article_id=payload.article_id,
        scheduled_at=payload.scheduled_at,
        is_sent=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return {
        "success": True,
        "message": "Notification scheduled successfully",
        "data": {"notification_id": str(notification.id), "scheduled_at": notification.scheduled_at.isoformat()}
    }


# --- Admin: Notifications management ---

@router.get("/notifications")
async def list_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List all notifications with pagination."""
    total = int(await db.scalar(select(func.count(Notification.id))) or 0)
    result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    notifications = result.scalars().all()
    items = []
    for n in notifications:
        items.append({
            "id": str(n.id),
            "title": n.title,
            "body": n.body,
            "article_id": str(n.article_id) if n.article_id else None,
            "article_title": n.article.title if n.article else None,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "scheduled_at": n.scheduled_at.isoformat() if n.scheduled_at else None,
            "is_sent": n.is_sent,
            "created_at": n.created_at.isoformat(),
        })
    return {"success": True, "message": "Notifications retrieved successfully", "data": _paginate(items, total, page, limit)}


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete a notification."""
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    await db.delete(notification)
    await db.commit()
    return {"success": True, "message": "Notification deleted", "data": {"id": str(notification_id)}}


# --- Admin: Comments moderation ---

from app.models.comment import Comment

@router.get("/comments")
async def list_comments(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List all comments across articles for moderation."""
    total = int(await db.scalar(select(func.count(Comment.id))) or 0)
    result = await db.execute(
        select(Comment).order_by(Comment.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    comments = result.scalars().all()
    items = []
    for c in comments:
        items.append({
            "id": str(c.id),
            "body": c.body,
            "article_id": str(c.article_id),
            "article_title": c.article.title if c.article else None,
            "user_id": str(c.user_id),
            "user_name": c.user_name,
            "user_avatar_url": c.user_avatar_url,
            "parent_id": str(c.parent_id) if c.parent_id else None,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        })
    return {"success": True, "message": "Comments retrieved successfully", "data": _paginate(items, total, page, limit)}


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: UUID,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete a comment (moderation)."""
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    await db.delete(comment)
    await db.commit()
    return {"success": True, "message": "Comment deleted", "data": {"id": str(comment_id)}}


# --- Admin: Categories with article counts ---

@router.get("/categories")
async def admin_list_categories(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List all categories with article counts for admin."""
    result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.slug,
            Category.icon,
            Category.created_at,
            Category.updated_at,
            func.count(Article.id).label("article_count"),
        )
        .outerjoin(Article, Article.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name.asc())
    )
    rows = result.all()
    items = [
        {
            "id": str(r.id),
            "name": r.name,
            "slug": r.slug,
            "icon": r.icon,
            "article_count": int(r.article_count),
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]
    return {"success": True, "message": "Categories retrieved successfully", "data": items}

