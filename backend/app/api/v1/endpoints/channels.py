"""Channels endpoints."""


from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
import logging

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db
from app.models.followed_channel import FollowedChannel
from app.models.user import User
from app.schemas.channel import ChannelResponse


router = APIRouter(prefix="/channels", tags=["channels"])
settings = get_settings()
logger = logging.getLogger(__name__)

CHANNEL_NAME_MAP = {
    "UCupvZG-5ko_eiXAupbDfxWw": "CNN",
    "UChqUTb7kYRX8-EiaN3XFrSQ": "Al Jazeera",
    "UCBi2mrWuNuyYy4gbM6fU18Q": "ABC News",
    "UCeY0bbntWzzVIaj2z3QigXg": "NBC News",
    "UCoMdktPbSTixAyNGwb-UYkQ": "Sky News",
    "UCknLrEdhRCp1aegoMqRaCZg": "CBS News",
    "UCQfwfsi5VrQ8yKZ-UWmAEFg": "Reuters",
    "UCIALMKvObZNtJ6AmdCLP7Lg": "Bloomberg Television",
    "UCIRYBXDze5krPDzAEOxFGVA": "The Sun"
}


@router.get("")
async def list_channels(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all available YouTube channels."""

    channel_ids = getattr(settings, "YOUTUBE_NEWS_CHANNEL_IDS", "")
    if not channel_ids:
        return {"success": True, "message": "Channels retrieved successfully", "data": []}
        
    channels = [c.strip() for c in channel_ids.split(",") if c.strip()]
    
    # Try to check if user is authenticated to return is_following flag
    user: User | None = None
    try:
        from app.core.dependencies import get_user_from_token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            user = await get_user_from_token(token, db)
    except Exception as exc:
        logger.warning("Optional auth failed on list_channels: %s", exc)

    following_ids = set()
    if user:
        result = await db.execute(select(FollowedChannel.channel_id).where(FollowedChannel.user_id == user.id))
        following_ids = set(result.scalars().all())

    # For a real implementation, we'd query YouTube API or a local DB table for the channel names.
    # Here we mock it slightly since they are just IDs in settings.
    items = []
    for cid in channels:
        items.append({
            "channel_id": cid,
            "channel_name": CHANNEL_NAME_MAP.get(cid, f"Channel {cid}"),
            "channel_logo_url": None,
            "is_following": cid in following_ids
        })

    return {"success": True, "message": "Channels retrieved successfully", "data": items}


@router.get("/following")
async def list_followed_channels(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List channels the current user is following. Returns empty list if not authenticated."""

    # Attempt optional authentication — return empty list if not logged in
    current_user: User | None = None
    try:
        from app.core.dependencies import get_user_from_token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            current_user = await get_user_from_token(token, db)
    except Exception as exc:
        logger.warning("Optional auth failed on list_followed_channels: %s", exc)

    if not current_user:
        return {"success": True, "message": "Not authenticated", "data": []}

    result = await db.execute(
        select(FollowedChannel).where(FollowedChannel.user_id == current_user.id).order_by(FollowedChannel.created_at.desc())
    )
    items = result.scalars().all()

    data = []
    for item in items:
        data.append({
            "channel_id": item.channel_id,
            "channel_name": item.channel_name,
            "channel_logo_url": item.channel_logo_url,
            "is_following": True
        })

    return {"success": True, "message": "Followed channels retrieved", "data": data}


@router.post("/{channel_id}/follow", status_code=status.HTTP_201_CREATED)
async def follow_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Follow a specific channel."""

    existing = await db.scalar(
        select(FollowedChannel).where(FollowedChannel.user_id == current_user.id, FollowedChannel.channel_id == channel_id)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following this channel")

    followed = FollowedChannel(
        user_id=current_user.id,
        channel_id=channel_id,
        channel_name=CHANNEL_NAME_MAP.get(channel_id, f"Channel {channel_id}"),
    )
    db.add(followed)
    await db.commit()
    await db.refresh(followed)

    return {
        "success": True,
        "message": "Channel followed successfully",
        "data": {
            "channel_id": followed.channel_id,
            "channel_name": followed.channel_name,
            "is_following": True
        }
    }


@router.delete("/{channel_id}/follow")
async def unfollow_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Unfollow a specific channel."""

    existing = await db.scalar(
        select(FollowedChannel).where(FollowedChannel.user_id == current_user.id, FollowedChannel.channel_id == channel_id)
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not followed")

    await db.delete(existing)
    await db.commit()

    return {
        "success": True,
        "message": "Channel unfollowed successfully",
        "data": {"channel_id": channel_id, "is_following": False}
    }
