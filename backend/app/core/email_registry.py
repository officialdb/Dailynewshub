"""Shared email uniqueness checks for user and developer accounts."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.developer import Developer
from app.models.user import User


# --- API PLATFORM ---
async def email_in_use(
    db: AsyncSession,
    email: str,
    *,
    exclude_user_id: UUID | None = None,
    exclude_developer_id: UUID | None = None,
) -> bool:
    """Return True if an email is already used by either account type."""

    normalized_email = email.casefold()

    user_query = select(User.id).where(func.lower(User.email) == normalized_email)
    if exclude_user_id is not None:
        user_query = user_query.where(User.id != exclude_user_id)
    if await db.scalar(user_query) is not None:
        return True

    developer_query = select(Developer.id).where(func.lower(Developer.email) == normalized_email)
    if exclude_developer_id is not None:
        developer_query = developer_query.where(Developer.id != exclude_developer_id)
    return await db.scalar(developer_query) is not None
