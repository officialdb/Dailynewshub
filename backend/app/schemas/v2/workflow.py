"""Workflow schemas for the v2 NMS API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ArticleStatus, FactCheckStatus


class TransitionRequest(BaseModel):
    """Request to transition an article to a new status."""

    to_status: ArticleStatus
    comments: str | None = Field(default=None, max_length=2000)


class TransitionResponse(BaseModel):
    """Result of a workflow transition."""

    article_id: UUID
    from_status: ArticleStatus
    to_status: ArticleStatus
    reviewer_id: UUID
    comments: str | None = None
    created_at: datetime


class AssignRequest(BaseModel):
    """Assign an article to a reviewer."""

    assigned_to_id: UUID


class FactCheckSubmit(BaseModel):
    """Submit a fact check result."""

    status: FactCheckStatus
    findings: str | None = Field(default=None, max_length=5000)
    sources_verified: str | None = Field(default=None, max_length=5000)


class FactCheckResponse(BaseModel):
    """Serialized fact check record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    checker_id: UUID
    status: FactCheckStatus
    findings: str | None = None
    sources_verified: str | None = None
    created_at: datetime
    updated_at: datetime


class RevisionResponse(BaseModel):
    """Serialized revision/history record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_id: UUID
    reviewer_id: UUID
    action: str
    from_status: str
    to_status: str
    comments: str | None = None
    created_at: datetime
