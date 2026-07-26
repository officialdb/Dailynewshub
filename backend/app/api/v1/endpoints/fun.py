"""Fun zone routes — quotes, quizzes, debates."""

import json
import logging
import random
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.models.article import Article

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fun", tags=["Fun"])

SAMPLE_QUOTES = [
    {"quote": "The press is the best instrument for enlightening the mind of man.", "author": "Thomas Jefferson"},
    {"quote": "Freedom of the press is not just important to democracy, it is democracy.", "author": "Walter Cronkite"},
    {"quote": "Journalism is printing what someone else does not want printed. Everything else is public relations.", "author": "George Orwell"},
    {"quote": "The duty of a journalist is to comfort the afflicted and afflict the comfortable.", "author": "Finley Peter Dunne"},
    {"quote": "News is what somebody somewhere wants to suppress; all the rest is advertising.", "author": "Lord Northcliffe"},
    {"quote": "If it bleeds, it leads.", "author": "News Industry Adage"},
    {"quote": "The first draft of history is journalism.", "author": "Phil Graham"},
    {"quote": "In the age of information, ignorance is a choice.", "author": "Donald Miller"},
]


@router.get("/quote-of-the-day")
async def quote_of_the_day() -> dict:
    """Return a random inspirational news/journalism quote."""
    quote = random.choice(SAMPLE_QUOTES)
    return {"success": True, "message": "Quote fetched", "data": quote}


@router.get("/news-quiz")
async def generate_news_quiz(
    article_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate a 3-question multiple choice quiz based on an article."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    from app.services.ai_summarizer import call_groq

    prompt = (
        f"Based on this news article, generate exactly 3 multiple choice questions.\n"
        f"Article title: {article.title}\n"
        f"Article content: {(article.content or '')[:2000]}\n\n"
        "Return ONLY a valid JSON array with this exact format:\n"
        '[{"question": "Question text?", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "Why"}]'
    )

    try:
        response = await call_groq(prompt)
        quiz = json.loads(response)
        return {"success": True, "message": "Quiz generated", "data": quiz}
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate quiz")


@router.get("/news-debate")
async def generate_debate_topic(
    article_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate a debate topic with two opposing arguments from an article."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    from app.services.ai_summarizer import call_groq

    prompt = (
        f"Based on this news article, generate a debate topic with two opposing viewpoints.\n"
        f"Article: {article.title} — {(article.content or '')[:1000]}\n\n"
        "Return ONLY valid JSON:\n"
        '{"topic": "Debate topic", "side_a": {"position": "A", "argument": "..."}, "side_b": {"position": "B", "argument": "..."}}'
    )

    try:
        response = await call_groq(prompt)
        debate = json.loads(response)
        return {"success": True, "message": "Debate generated", "data": debate}
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate debate")
