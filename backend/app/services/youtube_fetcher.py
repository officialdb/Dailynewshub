"""YouTube fetcher service for Reels."""

from __future__ import annotations

import asyncio
import isodate
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.category import Category
from app.models.reel import Reel
from app.schemas.reel import ReelResponse
from app.websocket.connection_manager import connection_manager

settings = get_settings()
logger = logging.getLogger(__name__)

# --- BUG FIX ---
async def fetch_and_save_reels() -> list[Reel]:
    """Fetch videos from all configured YouTube news channels."""
    if not hasattr(settings, "YOUTUBE_API_KEY") or not settings.YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY not configured.")
        return []

    channel_ids = settings.youtube_channel_ids_list
    logger.info(f"Fetching reels from {len(channel_ids)} channels")
    
    new_reels: list[Reel] = []

    async with AsyncSessionLocal() as session:
        try:
            category_result = await session.execute(select(Category).where(Category.slug == "general"))
            default_category = category_result.scalar_one_or_none()
            if not default_category:
                default_category = Category(name="General", slug="general")
                session.add(default_category)
                await session.flush()

            for channel_id in channel_ids:
                try:
                    fetched = await fetch_channel_videos(channel_id, default_category, session)
                    new_reels.extend(fetched)
                    await asyncio.sleep(2) # Prevent YouTube API rate limiting
                except Exception as e:
                    logger.error(f"Failed fetching channel {channel_id}: {e}")
                    continue

            await session.commit()
            for reel in new_reels:
                await session.refresh(reel)
                
        except Exception as exc:
            logger.error(f"Error fetching reels: {exc}")
            await session.rollback()
            raise

        if new_reels:
            event = {
                "type": "new_reels",
                "count": len(new_reels),
                "items": [ReelResponse.model_validate(r).model_dump(mode="json") for r in new_reels],
            }
            await connection_manager.broadcast(event)

        return new_reels


async def fetch_channel_videos(channel_id: str, default_category: Category, session: AsyncSession) -> list[Reel]:
    """Fetch latest videos from a single YouTube channel and save to DB."""
    channels_url = "https://www.googleapis.com/youtube/v3/channels"
    channels_params = {
        "key": settings.YOUTUBE_API_KEY,
        "id": channel_id,
        "part": "contentDetails",
    }

    fetched_reels = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Get the 'uploads' playlist ID for the channel
        try:
            channels_resp = await client.get(channels_url, params=channels_params)
            channels_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting channel {channel_id}: {e.response.text}")
            raise
        
        channels_data = channels_resp.json()
        if not channels_data.get("items"):
            logger.warning(f"Channel {channel_id} not found or returned 0 items.")
            return []
            
        try:
            uploads_playlist_id = channels_data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        except KeyError:
            logger.warning(f"Could not find uploads playlist for channel {channel_id}.")
            return []

        # Step 2: Fetch the latest 10 videos from the uploads playlist
        playlist_url = "https://www.googleapis.com/youtube/v3/playlistItems"
        playlist_params = {
            "key": settings.YOUTUBE_API_KEY,
            "playlistId": uploads_playlist_id,
            "part": "snippet",
            "maxResults": 10,
        }
        
        try:
            playlist_resp = await client.get(playlist_url, params=playlist_params)
            playlist_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting playlist {uploads_playlist_id}: {e.response.text}")
            raise

        playlist_data = playlist_resp.json()
        items = playlist_data.get("items", [])
        logger.info(f"Channel {channel_id}: found {len(items)} videos in uploads playlist")

        if not items:
            return []

        video_ids = [item["snippet"]["resourceId"]["videoId"] for item in items if "videoId" in item.get("snippet", {}).get("resourceId", {})]
        if not video_ids:
            return []

        # Step 3: Fetch video details
        videos_url = "https://www.googleapis.com/youtube/v3/videos"
        videos_params = {
            "key": settings.YOUTUBE_API_KEY,
            "id": ",".join(video_ids),
            "part": "contentDetails,snippet,player",
        }

        v_resp = await client.get(videos_url, params=videos_params)
        v_resp.raise_for_status()
        v_data = v_resp.json()

        v_items = v_data.get("items", [])
        for v in v_items:
            video_id = v["id"]

            existing = await session.scalar(select(Reel).where(Reel.youtube_video_id == video_id))
            if existing:
                continue

            snippet = v.get("snippet", {})
            content_details = v.get("contentDetails", {})

            title = snippet.get("title", "")
            description = snippet.get("description", "")
            thumbnails = snippet.get("thumbnails", {})
            thumbnail_url = thumbnails.get("high", thumbnails.get("default", {})).get("url")
            channel_name = snippet.get("channelTitle", "Unknown")

            # --- BUG FIX --- Detect aspect ratio
            player_html = v.get("player", {}).get("embedHtml", "")
            aspect_ratio = "16:9"
            if player_html:
                width_match = re.search(r'width="(\d+)"', player_html)
                height_match = re.search(r'height="(\d+)"', player_html)
                if width_match and height_match:
                    width = int(width_match.group(1))
                    height = int(height_match.group(1))
                    if height > width:
                        aspect_ratio = "9:16"

            duration_str = content_details.get("duration", "PT0S")
            try:
                duration = isodate.parse_duration(duration_str)
                duration_seconds = int(duration.total_seconds())
            except (isodate.ISO8601Error, ValueError):
                duration_seconds = 0

            published_at_str = snippet.get("publishedAt")
            published_at = None
            if published_at_str:
                try:
                    published_at = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
                except ValueError:
                    pass

            reel = Reel(
                youtube_video_id=video_id,
                title=title,
                description=description,
                thumbnail_url=thumbnail_url,
                channel_id=channel_id,
                channel_name=channel_name,
                category_id=default_category.id,
                duration_seconds=duration_seconds,
                aspect_ratio=aspect_ratio, # --- BUG FIX ---
                published_at=published_at or datetime.now(timezone.utc),
            )
            session.add(reel)
            fetched_reels.append(reel)

    return fetched_reels
