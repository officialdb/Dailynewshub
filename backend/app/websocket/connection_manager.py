"""Connection manager for active WebSocket clients."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from app.core.config import get_settings


settings = get_settings()

# --- SEC FIX SEC-011 ---
MAX_CONNECTIONS_PER_USER = 3
MAX_CONNECTIONS_GLOBAL = 10_000
MAX_MESSAGE_SIZE_BYTES = 4_096
DEFAULT_FEED = "news-feed"


class ConnectionManager:
    """Manage active WebSocket connections and fan-out broadcasts."""

    def __init__(self) -> None:
        """Initialize the active connection store."""

        # --- SEC FIX SEC-011 ---
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)
        self.user_connections: dict[str, list[WebSocket]] = defaultdict(list)
        self.connection_users: dict[WebSocket, str | None] = {}
        self.connection_feeds: dict[WebSocket, str] = {}
        self._total_connections = 0
        self.redis_client: Any | None = None
        self.instance_id: str | None = None
        self.redis_listener_task: asyncio.Task[None] | None = None
        self.redis_channel = "news-feed-events"

    def configure(self, redis_client: Any | None, instance_id: str | None) -> None:
        """Configure the Redis client used for cross-instance broadcasts."""

        self.redis_client = redis_client
        self.instance_id = instance_id

    async def start_redis_listener(self) -> None:
        """Start listening for Redis pub/sub events if Redis is available."""

        if self.redis_client is None or self.redis_listener_task is not None:
            return

        self.redis_listener_task = asyncio.create_task(self._listen_for_events())

    async def stop_redis_listener(self) -> None:
        """Stop the Redis pub/sub listener."""

        if self.redis_listener_task is not None:
            self.redis_listener_task.cancel()
            try:
                await self.redis_listener_task
            except asyncio.CancelledError:
                pass
            self.redis_listener_task = None

    async def _listen_for_events(self) -> None:
        """Receive pub/sub messages and rebroadcast them locally."""

        if self.redis_client is None:
            return

        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(self.redis_channel)

        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    raw_data = message.get("data")
                    if not raw_data:
                        await asyncio.sleep(0.1)
                        continue

                    try:
                        payload = json.loads(raw_data)
                    except json.JSONDecodeError:
                        await asyncio.sleep(0.1)
                        continue

                    if payload.get("origin") == self.instance_id:
                        await asyncio.sleep(0.1)
                        continue

                    event = payload.get("payload")
                    if event is not None:
                        await self.broadcast(event)

                await asyncio.sleep(0.1)
        finally:
            await pubsub.close()

    async def publish_event(self, message: Any) -> None:
        """Publish an event to Redis for other backend instances."""

        redis_client = self.redis_client
        close_client = False
        if redis_client is None:
            try:
                import redis.asyncio as redis  # local import to avoid startup coupling

                redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                close_client = True
            except Exception:
                return

        try:
            await redis_client.publish(
                self.redis_channel,
                json.dumps({"origin": self.instance_id, "payload": message}, default=str),
            )
        finally:
            if close_client:
                await redis_client.aclose()

    async def connect(
        self,
        websocket: WebSocket,
        feed: str = DEFAULT_FEED,
        user_id: str | None = None,
    ) -> bool:
        """Accept and store a new WebSocket connection with limit enforcement."""

        # --- SEC FIX SEC-011 ---
        if self._total_connections >= MAX_CONNECTIONS_GLOBAL:
            await websocket.close(code=4029, reason="Server at capacity")
            return False

        if user_id:
            user_conns = self.user_connections.get(user_id, [])
            if len(user_conns) >= MAX_CONNECTIONS_PER_USER:
                await websocket.close(code=4029, reason="Too many connections for this user")
                return False

        await websocket.accept()
        self.active_connections[feed].append(websocket)
        self.connection_feeds[websocket] = feed
        self.connection_users[websocket] = user_id
        if user_id:
            self.user_connections[user_id].append(websocket)
        self._total_connections += 1
        return True

    def disconnect(self, websocket: WebSocket, feed: str | None = None, user_id: str | None = None) -> None:
        """Remove a WebSocket connection from all tracking structures."""

        # --- SEC FIX SEC-011 ---
        actual_feed = feed or self.connection_feeds.pop(websocket, DEFAULT_FEED)
        actual_user_id = user_id if user_id is not None else self.connection_users.pop(websocket, None)
        connections = self.active_connections.get(actual_feed, [])
        if websocket in connections:
            connections.remove(websocket)
            self._total_connections = max(0, self._total_connections - 1)
        if actual_user_id and websocket in self.user_connections.get(actual_user_id, []):
            self.user_connections[actual_user_id].remove(websocket)

    async def send_personal_message(self, message: Any, websocket: WebSocket) -> None:
        """Send a JSON serializable message to one client."""

        await websocket.send_json(message)

    async def broadcast(self, message: Any, feed: str = DEFAULT_FEED) -> None:
        """Broadcast a JSON serializable message to all connected clients on a feed."""

        stale_connections: list[WebSocket] = []
        # --- SEC FIX SEC-011 ---
        for connection in self.active_connections.get(feed, []):
            try:
                await connection.send_json(message)
            except Exception:
                stale_connections.append(connection)

        for connection in stale_connections:
            self.disconnect(connection, feed=feed)


connection_manager = ConnectionManager()
