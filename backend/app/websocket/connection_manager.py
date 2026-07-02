"""Connection manager for active WebSocket clients."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket

from app.core.config import get_settings


settings = get_settings()


class ConnectionManager:
    """Manage active WebSocket connections and fan-out broadcasts."""

    def __init__(self) -> None:
        """Initialize the active connection store."""

        self.active_connections: list[WebSocket] = []
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

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and store a new WebSocket connection."""

        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from the active list."""

        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: Any, websocket: WebSocket) -> None:
        """Send a JSON serializable message to one client."""

        await websocket.send_json(message)

    async def broadcast(self, message: Any) -> None:
        """Broadcast a JSON serializable message to all connected clients."""

        stale_connections: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                stale_connections.append(connection)

        for connection in stale_connections:
            self.disconnect(connection)


connection_manager = ConnectionManager()
