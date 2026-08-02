# --- SEC FIX SEC-001 ---
"""Persistent token revocation store in PostgreSQL."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Index, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class RevokedToken(Base):
    """Hash-only storage for explicitly revoked JWTs."""

    __tablename__ = "revoked_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("ix_revoked_tokens_expires_at", "expires_at"),
    )
