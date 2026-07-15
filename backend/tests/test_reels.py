"""Tests for Reels endpoints."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_list_reels_empty(client: AsyncClient):
    """Test listing reels when empty."""
    response = await client.get("/api/v1/reels")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "items" in data["data"]
    assert data["data"]["total"] == 0

async def test_channels_empty(client: AsyncClient):
    """Test channels endpoint."""
    response = await client.get("/api/v1/channels")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
