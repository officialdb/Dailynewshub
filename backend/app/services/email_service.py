"""Email helper for developer account verification."""

from __future__ import annotations

import logging

from app.core.config import get_settings


logger = logging.getLogger(__name__)


# --- API PLATFORM ---
async def send_verification_email(email: str, name: str, token: str) -> None:
    """Send or log a developer verification email."""

    settings = get_settings()
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    verify_url = f"{frontend_url.rstrip('/')}/developer/verify-email?token={token}"
    logger.info("Developer verification email queued for %s (%s)", email, name)
    logger.info("Verification URL: %s", verify_url)
