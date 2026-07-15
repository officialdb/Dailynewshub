"""Reaction-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ReactionCreate(BaseModel):
    """Payload for creating a reaction."""
    reaction_type: Literal["fire", "wow", "like"]


class ReactionResponse(BaseModel):
    """Serialized reaction response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    article_id: UUID
    reaction_type: str
    created_at: datetime


class ReactionSummary(BaseModel):
    """Reaction summary showing counts and current user's reaction."""

    counts: dict[str, int]
    current_user_reaction: str | None = None
