"""Tests for WebSocket connection management."""

from __future__ import annotations

import unittest

from app.websocket.connection_manager import ConnectionManager


class DummyWebSocket:
    """Minimal WebSocket stand-in for connection manager tests."""

    def __init__(self) -> None:
        """Initialize the dummy websocket state."""

        self.messages: list[object] = []
        self.accepted = False

    async def accept(self) -> None:
        """Pretend to accept a websocket connection."""

        self.accepted = True

    async def send_json(self, message: object) -> None:
        """Collect JSON messages sent by the manager."""

        self.messages.append(message)


class ConnectionManagerTests(unittest.IsolatedAsyncioTestCase):
    """Exercise the active connection registry and broadcast flow."""

    async def test_broadcast_reaches_connected_clients(self) -> None:
        """Broadcast messages should reach every connected websocket."""

        manager = ConnectionManager()
        websocket = DummyWebSocket()

        await manager.connect(websocket)
        await manager.broadcast({"type": "ping"})

        self.assertTrue(websocket.accepted)
        self.assertEqual(websocket.messages, [{"type": "ping"}])

