"""Central router that aggregates version 1 endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import admin, articles, auth, bookmarks, categories, health, users, websocket


router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(articles.router)
router.include_router(categories.router)
router.include_router(bookmarks.router)
router.include_router(users.router)
router.include_router(admin.router)
router.include_router(health.router)
router.include_router(websocket.router)
