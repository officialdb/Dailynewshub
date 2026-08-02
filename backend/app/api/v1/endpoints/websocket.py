"""WebSocket routes for live article updates."""


import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import get_settings
from app.websocket.connection_manager import MAX_MESSAGE_SIZE_BYTES, connection_manager


router = APIRouter(prefix="/ws", tags=["websocket"])
logger = logging.getLogger(__name__)
settings = get_settings()


# --- SEC FIX SEC-003 ---
async def authenticate_websocket(websocket: WebSocket, token: str | None) -> dict | None:
    """Validate a JWT token passed as a WebSocket query parameter."""

    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return None
        return payload
    except JWTError:
        try:
            payload = jwt.decode(token, settings.DEVELOPER_SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("type") != "developer_access":
                await websocket.close(code=4001, reason="Invalid token type")
                return None
            return payload
        except JWTError:
            await websocket.close(code=4001, reason="Invalid or expired token")
            return None
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return None


@router.websocket("/news-feed")
async def news_feed_websocket(
    websocket: WebSocket,
    token: str | None = Query(None, description="Bearer token issued by the auth endpoints."),
) -> None:
    """Authenticate a WebSocket connection and subscribe it to live updates."""

    # --- SEC FIX SEC-003 ---
    payload = await authenticate_websocket(websocket, token)
    if not payload:
        return
    # --- SEC FIX SEC-011 ---
    user_id = payload.get("sub")
    accepted = await connection_manager.connect(websocket, feed="news-feed", user_id=user_id)
    if not accepted:
        return
    await connection_manager.send_personal_message(
        {
            "success": True,
            "message": "WebSocket connected",
            "data": {"user_id": str(user_id)},
        },
        websocket,
    )

    try:
        while True:
            message = await websocket.receive_text()
            # --- SEC FIX SEC-011 ---
            if len(message.encode("utf-8")) > MAX_MESSAGE_SIZE_BYTES:
                await websocket.close(code=1009, reason="Message too large")
                return
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, feed="news-feed", user_id=user_id)


@router.websocket("/reels-feed")
async def reels_feed_websocket(websocket: WebSocket, token: str | None = Query(None)):
    """WebSocket endpoint for real-time reel updates."""

    # --- SEC FIX SEC-003 ---
    payload = await authenticate_websocket(websocket, token)
    if not payload:
        return
    # --- SEC FIX SEC-011 ---
    user_id = payload.get("sub")
    accepted = await connection_manager.connect(websocket, feed="reels-feed", user_id=user_id)
    if not accepted:
        return
    try:
        while True:
            message = await websocket.receive_text()
            # --- SEC FIX SEC-011 ---
            if len(message.encode("utf-8")) > MAX_MESSAGE_SIZE_BYTES:
                await websocket.close(code=1009, reason="Message too large")
                return
    except WebSocketDisconnect:
        logger.info("Reels WebSocket client disconnected.")
    except Exception as exc:
        logger.warning("Unexpected error in reels WebSocket: %s", exc)
    finally:
        connection_manager.disconnect(websocket, feed="reels-feed", user_id=user_id)
