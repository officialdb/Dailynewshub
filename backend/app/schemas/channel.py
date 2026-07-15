"""Channel-related Pydantic schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ChannelResponse(BaseModel):
    """Serialized channel response."""

    model_config = ConfigDict(from_attributes=True)

    channel_id: str
    channel_name: str
    channel_logo_url: str | None = None
    is_following: bool = False


class PaginatedChannelResponse(BaseModel):
    """Paginated channel response envelope."""

    items: list[ChannelResponse]
    total: int
    page: int
    limit: int
    pages: int
