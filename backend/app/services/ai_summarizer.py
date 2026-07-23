"""AI Summarizer service."""

from __future__ import annotations

import json
import logging
import httpx
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.models.article import Article

settings = get_settings()
logger = logging.getLogger(__name__)


async def summarize_article(article_id: UUID, content: str, db: AsyncSession) -> list[str]:
    """Generate a 3-bullet point summary of an article using Groq API."""

    article = await db.get(Article, article_id)
    if article and article.ai_summary:
        try:
            return json.loads(article.ai_summary)
        except json.JSONDecodeError:
            pass

    if not hasattr(settings, "GROQ_API_KEY") or not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not configured.")
        return []

    prompt = (
        "Summarize the following article into exactly 3 concise bullet points. "
        "Return ONLY a valid JSON array of 3 strings. Do not include markdown or extra text.\n\n"
        f"Article:\n{content[:4000]}"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()
            message_content = data["choices"][0]["message"]["content"].strip()
            
            # Try to parse JSON array from output
            # Strip potential markdown formatting like ```json
            if message_content.startswith("```"):
                message_content = message_content.split("\n", 1)[1]
                if message_content.endswith("```"):
                    message_content = message_content.rsplit("\n", 1)[0]
                    
            summary_list = json.loads(message_content)
            if isinstance(summary_list, list) and len(summary_list) > 0:
                result = [str(item) for item in summary_list[:3]]
                if article:
                    article.ai_summary = json.dumps(result)
                    await db.commit()
                return result
                
    except Exception as exc:
        logger.error(f"Failed to summarize article: {exc}")
        
    return []
