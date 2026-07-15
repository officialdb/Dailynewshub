"""WebSocket routes for live article updates."""


import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_user_from_token
from app.websocket.connection_manager import connection_manager


router = APIRouter(prefix="/ws", tags=["websocket"])
logger = logging.getLogger(__name__)


@router.websocket("/news-feed")
async def news_feed(
    websocket: WebSocket,
    token: str = Query(..., description="Bearer token issued by the auth endpoints."),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Authenticate a WebSocket connection and subscribe it to live updates."""

    user = await get_user_from_token(token=token, db=db, request=websocket)
    await connection_manager.connect(websocket)
    await connection_manager.send_personal_message(
        {
            "success": True,
            "message": "WebSocket connected",
            "data": {"user_id": str(user.id)},
        },
        websocket,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)


@router.websocket("/reels-feed")
async def reels_websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time reel updates."""
    await connection_manager.connect(websocket)
    try:
        while True:
            # Client could send pings or messages, we just echo or drop for now
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("Reels WebSocket client disconnected.")
    except Exception as exc:
        logger.warning("Unexpected error in reels WebSocket: %s", exc)
    finally:
        connection_manager.disconnect(websocket)
