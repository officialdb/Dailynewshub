"""Firebase Cloud Messaging push notification helpers."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.device_token import DeviceToken

logger = logging.getLogger(__name__)

settings = get_settings()

try:  # pragma: no cover - optional dependency bootstrap
    import firebase_admin
    from firebase_admin import credentials, messaging
except Exception:  # pragma: no cover - fallback when SDK is unavailable
    firebase_admin = None
    credentials = None
    messaging = None

_firebase_initialized = False


def _ensure_firebase_initialized() -> bool:
    """Initialize the Firebase Admin SDK once if credentials are available."""

    global _firebase_initialized

    if _firebase_initialized:
        return True
    if firebase_admin is None or credentials is None:
        return False

    credential_path = Path(settings.FIREBASE_CREDENTIALS_PATH)
    if not credential_path.exists():
        logger.warning("Firebase credentials file is missing: %s", credential_path)
        return False

    if not firebase_admin._apps:  # type: ignore[attr-defined]
        firebase_admin.initialize_app(credentials.Certificate(str(credential_path)))

    _firebase_initialized = True
    return True


async def send_to_device(
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> bool:
    """Send a push notification to a single device token."""

    try:
        if not _ensure_firebase_initialized() or messaging is None:
            return False

        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
        )
        await asyncio.to_thread(messaging.send, message)
        return True
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.warning("FCM delivery failed for token %s: %s", token, exc)
        return False


async def send_to_all(
    title: str,
    body: str,
    data: dict[str, str] | None = None,
    db: AsyncSession | None = None,
) -> int:
    """Send a push notification to every stored active device token."""

    owns_session = db is None
    session = db
    if session is None:
        session = AsyncSessionLocal()

    try:
        tokens = (await session.execute(select(DeviceToken.fcm_token).distinct())).scalars().all()
        successes = 0
        for token in tokens:
            if await send_to_device(token=token, title=title, body=body, data=data):
                successes += 1
        return successes
    finally:
        if owns_session:
            await session.close()
