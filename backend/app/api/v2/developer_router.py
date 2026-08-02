"""Router for the developer platform endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v2.endpoints import developer_apps, developer_auth, developer_dashboard, developer_keys, developer_public


# --- API PLATFORM ---
router = APIRouter(prefix="/developer")
router.include_router(developer_auth.router, tags=["developer-auth"])
router.include_router(developer_apps.router, tags=["developer-apps"])
router.include_router(developer_keys.router, tags=["developer-keys"])
router.include_router(developer_dashboard.router, tags=["developer-dashboard"])
router.include_router(developer_public.router, tags=["developer-public"])
