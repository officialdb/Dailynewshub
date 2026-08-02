"""Media schemas for the v2 NMS API."""

from __future__ import annotations

from pydantic import BaseModel


class MediaUploadResponse(BaseModel):
    """Response after a successful media upload."""

    url: str
    filename: str
    content_type: str
    size_bytes: int
