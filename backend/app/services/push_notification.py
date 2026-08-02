"""Firebase Cloud Messaging push notification helpers."""

from __future__ import annotations

import asyncio
import json
import logging
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

    # --- SEC FIX SEC-013 ---
    if not settings.FIREBASE_CREDENTIALS_JSON:
        logger.warning("FIREBASE_CREDENTIALS_JSON environment variable is not set")
        return False

    if not firebase_admin._apps:  # type: ignore[attr-defined]
        credential_data = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
        firebase_admin.initialize_app(credentials.Certificate(credential_data))

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


# --- FIX 4: MULTICAST PUSH NOTIFICATIONS ---
async def send_multicast(tokens: list[str], title: str, body: str, data: dict[str, str] | None = None) -> tuple[int, int]:
    """
    Send FCM notification to up to 500 tokens per batch.
    Returns (success_count, failure_count, invalid_tokens).
    """
    if not tokens or not _ensure_firebase_initialized() or messaging is None:
        return 0, 0, []

    success_count = 0
    failure_count = 0
    invalid_tokens = []

    # Batch tokens into chunks of 500
    for i in range(0, len(tokens), 500):
        batch = tokens[i:i + 500]
        message = messaging.MulticastMessage(
            tokens=batch,
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
        )
        try:
            response = await asyncio.to_thread(messaging.send_multicast, message)
            success_count += response.success_count
            failure_count += response.failure_count

            # Find failed tokens (e.g. unregistered)
            if response.failure_count > 0:
                for idx, res in enumerate(response.responses):
                    if not res.success:
                        # Common errors indicating token should be removed
                        if res.exception and getattr(res.exception, 'code', None) in (
                            'messaging/invalid-registration-token',
                            'messaging/registration-token-not-registered',
                        ):
                            invalid_tokens.append(batch[idx])
        except Exception as exc:
            logger.warning("FCM multicast delivery failed: %s", exc)
            failure_count += len(batch)

    return success_count, failure_count, invalid_tokens


async def cleanup_invalid_tokens(invalid_tokens: list[str], db: AsyncSession) -> None:
    """
    Delete DeviceToken records whose FCM registration tokens are no longer valid.
    """
    if not invalid_tokens:
        return

    from sqlalchemy import delete
    try:
        await db.execute(delete(DeviceToken).where(DeviceToken.fcm_token.in_(invalid_tokens)))
        await db.commit()
    except Exception as exc:
        logger.warning("Failed to clean up invalid tokens: %s", exc)
