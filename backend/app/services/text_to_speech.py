"""Text-to-Speech service using Google Cloud TTS API."""

from __future__ import annotations

import base64
import logging
import os
from uuid import UUID
from pathlib import Path

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.article import Article

settings = get_settings()
logger = logging.getLogger(__name__)


async def generate_audio(article_id: UUID, content: str, db: AsyncSession, base_url: str) -> str | None:
    """Convert article text to speech using Google Cloud TTS."""

    article = await db.get(Article, article_id)
    if article and article.audio_url:
        return article.audio_url

    if not hasattr(settings, "GOOGLE_TTS_API_KEY") or not settings.GOOGLE_TTS_API_KEY:
        logger.warning("GOOGLE_TTS_API_KEY not configured.")
        return None

    # Truncate content to avoid huge requests
    truncated_content = content[:4000]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.GOOGLE_TTS_API_KEY}",
                json={
                    "input": {"text": truncated_content},
                    "voice": {"languageCode": "en-US", "name": "en-US-Journey-F"},
                    "audioConfig": {"audioEncoding": "MP3"}
                }
            )
            response.raise_for_status()
            data = response.json()
            audio_content = data.get("audioContent")
            
            if not audio_content:
                return None

            audio_bytes = base64.b64decode(audio_content)
            filename = f"audio_{article_id}.mp3"
            
            # Save to media/uploads directory so it's publicly accessible
            uploads_dir = Path(settings.UPLOADS_DIR)
            uploads_dir.mkdir(parents=True, exist_ok=True)
            
            file_path = uploads_dir / filename
            file_path.write_bytes(audio_bytes)
            
            public_url = f"{base_url.rstrip('/')}/media/{filename}"
            
            if article:
                article.audio_url = public_url
                await db.commit()
                
            return public_url
            
    except Exception as exc:
        logger.error(f"Failed to generate audio: {exc}")
        
    return None
