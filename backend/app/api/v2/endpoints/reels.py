"""Reels endpoints."""


from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies_v2 import get_current_user, get_db
from app.models.category import Category
from app.models.reel import Reel
from app.models.reel_comment import ReelComment
from app.models.reel_comment_like import ReelCommentLike
from app.models.reel_like import ReelLike
from app.models.bookmark import Bookmark
from app.models.followed_channel import FollowedChannel
from app.models.user import User
from app.schemas.reel import ReelResponse, PaginatedReelResponse
from app.schemas.comment import CommentCreate, CommentResponse


router = APIRouter(prefix="/reels", tags=["v2", "reels"])
logger = logging.getLogger(__name__)


async def get_optional_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    from app.core.dependencies_v2 import get_user_from_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            return await get_user_from_token(token, db)
        except Exception as exc:
            logger.warning("Optional auth token validation failed: %s", exc)
    return None


@router.get("")
async def list_reels(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> dict[str, object]:
    """Return a paginated list of reels, personalized when authenticated."""

    total = int(await db.scalar(select(func.count(Reel.id))) or 0)

    # Fetch reels — popular first for everyone
    pool_size = max(limit * 3, 50) if user else limit
    result = await db.execute(
        select(Reel)
        .order_by(
            Reel.view_count.desc(),
            Reel.like_count.desc(),
            Reel.published_at.desc().nullslast(),
            Reel.created_at.desc(),
        )
        .limit(pool_size)
    )
    reels = list(result.scalars().all())

    liked_reel_ids = set()
    bookmarked_reel_ids = set()
    followed_channel_ids = set()
    preferred_categories = set()

    if user:
        reel_ids = [r.id for r in reels]
        if reel_ids:
            likes = await db.execute(select(ReelLike.reel_id).where(ReelLike.user_id == user.id, ReelLike.reel_id.in_(reel_ids)))
            liked_reel_ids = set(likes.scalars().all())

            bookmarks = await db.execute(select(Bookmark.reel_id).where(Bookmark.user_id == user.id, Bookmark.reel_id.in_(reel_ids)))
            bookmarked_reel_ids = set([r for r in bookmarks.scalars().all() if r is not None])

        # Get user preferences for personalization
        if user.preferences:
            preferred_categories = {p.lower() for p in user.preferences}

        followed = await db.execute(
            select(FollowedChannel.channel_id).where(FollowedChannel.user_id == user.id)
        )
        followed_channel_ids = {row[0].lower() for row in followed.all()}

        # Score and rank reels based on preferences
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        def score_reel(reel):
            score = 0.0
            # Followed channel gets highest priority (+10)
            channel_id = (reel.channel_id or "").lower()
            if channel_id and channel_id in followed_channel_ids:
                score += 10.0
            # Category preference boost (+4)
            if reel.category_id:
                cat_name = ""
                if hasattr(reel, 'category') and reel.category and reel.category.name:
                    cat_name = reel.category.name.lower()
                if cat_name and cat_name in preferred_categories:
                    score += 4.0
            # View count popularity (up to +5)
            view_bonus = min((reel.view_count or 0) / 50, 5.0)
            score += view_bonus
            # Like count boost (up to +3)
            like_bonus = min((reel.like_count or 0) / 10, 3.0)
            score += like_bonus
            # Already liked/bookmarked slight boost
            if reel.id in liked_reel_ids:
                score += 1.0
            if reel.id in bookmarked_reel_ids:
                score += 1.0
            # Recency as tiebreaker (up to +2 for within 72h)
            if reel.published_at:
                pub = reel.published_at
                if pub.tzinfo is None:
                    pub = pub.replace(tzinfo=timezone.utc)
                hours_ago = (now - pub).total_seconds() / 3600
                if hours_ago < 72:
                    score += 2.0 * (1 - hours_ago / 72)
            return score

        reels.sort(key=score_reel, reverse=True)

    # Paginate
    start = (page - 1) * limit
    end = start + limit
    page_reels = reels[start:end]

    items = []
    for reel in page_reels:
        r_dict = ReelResponse.model_validate(reel).model_dump(mode="json")
        r_dict["is_liked"] = reel.id in liked_reel_ids
        r_dict["is_bookmarked"] = reel.id in bookmarked_reel_ids
        items.append(r_dict)

    pages = (total + limit - 1) // limit if total else 0
    return {
        "success": True, 
        "message": "Reels retrieved successfully", 
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }
    }


# ── Recommended reels endpoint (MUST be before /{id}) ─────────────────


@router.get("/recommended")
async def recommended_reels(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return pre-computed reel recommendations from Redis cache.

    Falls back to real-time computation if cache is empty.
    Target latency: < 100 ms (cache read < 10 ms).
    """
    from app.services.reels_recommender import (
        get_cached_recommendations,
        compute_recommendations,
        set_cached_recommendations,
        mark_recomputed,
    )

    redis_client = getattr(request.app.state, "redis", None)

    rec_ids: list[str] | None = None

    # Try cache first
    if redis_client is not None:
        rec_ids = await get_cached_recommendations(current_user.id, redis_client)

    # Cache miss — compute in real time
    if rec_ids is None:
        rec_ids = await compute_recommendations(current_user.id, db)
        if redis_client is not None:
            await set_cached_recommendations(current_user.id, rec_ids, redis_client)
            await mark_recomputed(current_user.id, redis_client)

    # Paginate
    start = (page - 1) * limit
    end = start + limit
    page_ids = rec_ids[start:end]

    if not page_ids:
        return {
            "success": True,
            "message": "No recommendations available",
            "data": {"items": [], "total": 0, "page": page, "limit": limit, "pages": 0},
        }

    # Fetch reel objects
    reel_uuids = [UUID(rid) for rid in page_ids]
    reel_result = await db.execute(
        select(Reel)
        .options(selectinload(Reel.category))
        .where(Reel.id.in_(reel_uuids))
    )
    reels_map = {r.id: r for r in reel_result.scalars().all()}

    # Preserve ranking order
    items = []
    for rid in reel_uuids:
        reel = reels_map.get(rid)
        if reel:
            r_dict = ReelResponse.model_validate(reel).model_dump(mode="json")
            r_dict["is_liked"] = False
            r_dict["is_bookmarked"] = False
            items.append(r_dict)

    # Batch check likes and bookmarks
    if items:
        item_ids = [UUID(r["id"]) for r in items]
        likes = await db.execute(
            select(ReelLike.reel_id).where(
                ReelLike.user_id == current_user.id,
                ReelLike.reel_id.in_(item_ids),
            )
        )
        liked_ids = set(likes.scalars().all())

        bookmarks = await db.execute(
            select(Bookmark.reel_id).where(
                Bookmark.user_id == current_user.id,
                Bookmark.reel_id.in_(item_ids),
            )
        )
        bookmarked_ids = {b for b in bookmarks.scalars().all() if b is not None}

        for item in items:
            item["is_liked"] = UUID(item["id"]) in liked_ids
            item["is_bookmarked"] = UUID(item["id"]) in bookmarked_ids

    total = len(rec_ids)
    pages = (total + limit - 1) // limit if total else 0
    return {
        "success": True,
        "message": "Recommendations retrieved",
        "data": {"items": items, "total": total, "page": page, "limit": limit, "pages": pages},
    }


@router.get("/{id}")
async def get_reel(
    id: UUID, 
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> dict[str, object]:
    """Return a single reel and increment view count."""

    reel = await db.get(Reel, id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")

    await db.execute(update(Reel).where(Reel.id == id).values(view_count=Reel.view_count + 1))
    await db.commit()
    await db.refresh(reel)

    r_dict = ReelResponse.model_validate(reel).model_dump(mode="json")
    if user:
        like = await db.scalar(select(ReelLike).where(ReelLike.user_id == user.id, ReelLike.reel_id == id))
        bookmark = await db.scalar(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.reel_id == id))
        r_dict["is_liked"] = like is not None
        r_dict["is_bookmarked"] = bookmark is not None

    return {"success": True, "message": "Reel retrieved successfully", "data": r_dict}


@router.get("/category/{slug}")
async def reels_by_category(
    slug: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Filter reels by category slug."""

    category = await db.scalar(select(Category).where(Category.slug == slug))
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    total = int(await db.scalar(select(func.count(Reel.id)).where(Reel.category_id == category.id)) or 0)
    result = await db.execute(
        select(Reel)
        .where(Reel.category_id == category.id)
        .order_by(Reel.published_at.desc().nullslast())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    
    pages = (total + limit - 1) // limit if total else 0
    items = [ReelResponse.model_validate(r).model_dump(mode="json") for r in result.scalars().all()]
    
    return {
        "success": True, 
        "message": "Reels retrieved successfully", 
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }
    }


@router.get("/channel/{channel_id}")
async def reels_by_channel(
    channel_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Filter reels by channel ID."""

    total = int(await db.scalar(select(func.count(Reel.id)).where(Reel.channel_id == channel_id)) or 0)
    result = await db.execute(
        select(Reel)
        .where(Reel.channel_id == channel_id)
        .order_by(Reel.published_at.desc().nullslast())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    
    pages = (total + limit - 1) // limit if total else 0
    items = [ReelResponse.model_validate(r).model_dump(mode="json") for r in result.scalars().all()]
    
    return {
        "success": True, 
        "message": "Reels retrieved successfully", 
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }
    }


@router.post("/{id}/like", status_code=status.HTTP_201_CREATED)
async def like_reel(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Toggle like creating ReelLike record."""

    reel = await db.get(Reel, id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")

    existing = await db.scalar(select(ReelLike).where(ReelLike.user_id == current_user.id, ReelLike.reel_id == id))
    if existing:
        return {"success": True, "message": "Reel already liked", "data": {"liked": True}}

    db.add(ReelLike(user_id=current_user.id, reel_id=id))
    await db.execute(update(Reel).where(Reel.id == id).values(like_count=Reel.like_count + 1))
    await db.commit()

    return {"success": True, "message": "Reel liked successfully", "data": {"liked": True}}


@router.delete("/{id}/like")
async def unlike_reel(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Unlike a reel."""

    reel = await db.get(Reel, id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")

    existing = await db.scalar(select(ReelLike).where(ReelLike.user_id == current_user.id, ReelLike.reel_id == id))
    if not existing:
        return {"success": True, "message": "Reel not liked", "data": {"liked": False}}

    await db.delete(existing)
    await db.execute(update(Reel).where(Reel.id == id).values(like_count=Reel.like_count - 1))
    await db.commit()

    return {"success": True, "message": "Reel unliked successfully", "data": {"liked": False}}


@router.get("/{id}/comments")
async def list_reel_comments(
    id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> dict[str, object]:
    """Paginated list of top-level reel comments (replies are nested inside)."""

    total = int(await db.scalar(
        select(func.count(ReelComment.id)).where(ReelComment.reel_id == id, ReelComment.parent_id.is_(None))
    ) or 0)
    result = await db.execute(
        select(ReelComment)
        .options(selectinload(ReelComment.user), selectinload(ReelComment.replies).selectinload(ReelComment.user))
        .where(ReelComment.reel_id == id, ReelComment.parent_id.is_(None))
        .order_by(ReelComment.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    comments = result.scalars().all()

    # Fetch IDs of comments liked by current user in one query
    liked_ids: set[UUID] = set()
    if user:
        comment_ids = [c.id for c in comments]
        reply_ids = [r.id for c in comments for r in c.replies]
        all_ids = comment_ids + reply_ids
        if all_ids:
            liked_result = await db.execute(
                select(ReelCommentLike.comment_id).where(
                    ReelCommentLike.user_id == user.id,
                    ReelCommentLike.comment_id.in_(all_ids),
                )
            )
            liked_ids = set(liked_result.scalars().all())

    def serialize_comment(c: ReelComment, include_replies: bool = True) -> dict:
        return {
            "id": str(c.id),
            "reel_id": str(c.reel_id),
            "parent_id": str(c.parent_id) if c.parent_id else None,
            "user_id": str(c.user_id),
            "user_name": c.user.name if c.user else "Unknown",
            "user_avatar_url": c.user.avatar_url if c.user else None,
            "body": c.content,
            "like_count": c.like_count,
            "is_liked": c.id in liked_ids,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "replies": [serialize_comment(r, False) for r in c.replies] if include_replies else [],
        }

    items = [serialize_comment(c) for c in comments]
    pages = (total + limit - 1) // limit if total else 0
    return {
        "success": True,
        "message": "Comments retrieved successfully",
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }
    }


@router.post("/{id}/comments", status_code=status.HTTP_201_CREATED)
async def add_reel_comment(
    id: UUID,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Create a top-level ReelComment or a reply (pass parent_id in body)."""

    reel = await db.get(Reel, id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")

    content = (getattr(payload, "content", None) or payload.body or "").strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment cannot be empty")

    parent_id = getattr(payload, "parent_id", None)
    if parent_id:
        parent = await db.get(ReelComment, parent_id)
        if not parent or parent.reel_id != id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")

    comment = ReelComment(reel_id=id, user_id=current_user.id, content=content, parent_id=parent_id)
    db.add(comment)
    # Only count top-level comments in the reel counter
    if not parent_id:
        await db.execute(update(Reel).where(Reel.id == id).values(comment_count=Reel.comment_count + 1))
    await db.commit()
    await db.refresh(comment)

    return {
        "success": True,
        "message": "Comment added successfully",
        "data": {
            "id": str(comment.id),
            "reel_id": str(comment.reel_id),
            "parent_id": str(comment.parent_id) if comment.parent_id else None,
            "user_id": str(comment.user_id),
            "user_name": current_user.name,
            "user_avatar_url": current_user.avatar_url,
            "body": comment.content,
            "like_count": 0,
            "is_liked": False,
            "created_at": comment.created_at.isoformat(),
            "updated_at": comment.updated_at.isoformat(),
            "replies": [],
        },
    }


@router.delete("/{id}/comments/{comment_id}")
async def delete_reel_comment(
    id: UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Delete ReelComment."""

    comment = await db.get(ReelComment, comment_id)
    if not comment or comment.reel_id != id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(comment)
    if not comment.parent_id:
        await db.execute(update(Reel).where(Reel.id == id).values(comment_count=Reel.comment_count - 1))
    await db.commit()

    return {"success": True, "message": "Comment deleted successfully", "data": {"id": str(comment_id)}}


@router.post("/{id}/comments/{comment_id}/like", status_code=status.HTTP_201_CREATED)
async def like_reel_comment(
    id: UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Like a reel comment."""

    comment = await db.get(ReelComment, comment_id)
    if not comment or comment.reel_id != id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing = await db.scalar(
        select(ReelCommentLike).where(
            ReelCommentLike.user_id == current_user.id,
            ReelCommentLike.comment_id == comment_id,
        )
    )
    if existing:
        return {"success": True, "message": "Already liked", "data": {"liked": True, "like_count": comment.like_count}}

    db.add(ReelCommentLike(user_id=current_user.id, comment_id=comment_id))
    await db.execute(
        update(ReelComment).where(ReelComment.id == comment_id).values(like_count=ReelComment.like_count + 1)
    )
    await db.commit()
    await db.refresh(comment)

    return {"success": True, "message": "Comment liked", "data": {"liked": True, "like_count": comment.like_count}}


@router.delete("/{id}/comments/{comment_id}/like")
async def unlike_reel_comment(
    id: UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Unlike a reel comment."""

    comment = await db.get(ReelComment, comment_id)
    if not comment or comment.reel_id != id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing = await db.scalar(
        select(ReelCommentLike).where(
            ReelCommentLike.user_id == current_user.id,
            ReelCommentLike.comment_id == comment_id,
        )
    )
    if not existing:
        return {"success": True, "message": "Not liked", "data": {"liked": False, "like_count": comment.like_count}}

    await db.delete(existing)
    await db.execute(
        update(ReelComment).where(ReelComment.id == comment_id).values(like_count=ReelComment.like_count - 1)
    )
    await db.commit()
    await db.refresh(comment)

    return {"success": True, "message": "Comment unliked", "data": {"liked": False, "like_count": comment.like_count}}


# ── Watch event tracking ───────────────────────────────────────────────

from pydantic import BaseModel, Field


class WatchEventPayload(BaseModel):
    """Payload for recording a reel watch event."""
    watch_duration_seconds: int = Field(ge=0)
    reel_duration_seconds: int = Field(ge=1, default=60)


@router.post("/{reel_id}/watch-event", status_code=status.HTTP_201_CREATED)
async def record_watch_event(
    reel_id: UUID,
    payload: WatchEventPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Record how much of a reel the user watched.

    Used by the recommendation engine to build user profile vectors.
    """
    from app.models.reel_watch_event import ReelWatchEvent

    reel = await db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")

    completion_ratio = min(
        payload.watch_duration_seconds / max(payload.reel_duration_seconds, 1),
        1.0,
    )
    skipped = completion_ratio < 0.2

    event = ReelWatchEvent(
        user_id=current_user.id,
        reel_id=reel_id,
        watch_duration_seconds=payload.watch_duration_seconds,
        completion_ratio=round(completion_ratio, 3),
        skipped=skipped,
    )
    db.add(event)

    # Increment view count
    await db.execute(
        update(Reel).where(Reel.id == reel_id).values(view_count=Reel.view_count + 1)
    )

    await db.commit()

    # Check if early recompute is needed (≥ 5 new events since last cache)
    redis_client = getattr(db, "_redis", None)
    # Async recompute check is handled by the Celery task

    return {
        "success": True,
        "message": "Watch event recorded",
        "data": {
            "completion_ratio": completion_ratio,
            "skipped": skipped,
        },
    }


