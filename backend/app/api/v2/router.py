"""Central router that aggregates version 2 endpoints (NMS)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v2.endpoints import (
    api_keys,
    articles,
    audit,
    auth,
    bookmarks,
    categories,
    channels,
    comments,
    dashboard,
    docs,
    fun,
    media,
    notifications,
    public,
    reels,
    roles,
    search,
    settings,
    tags,
    users,
    workflow,
    developers_admin,
    rss,
    article_analytics,
    revisions,
)
from app.api.v2.developer_router import router as developer_router

router = APIRouter(prefix="/api/v2")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(roles.router)
router.include_router(articles.router)
router.include_router(workflow.router)
router.include_router(categories.router)
router.include_router(tags.router)
router.include_router(media.router)
router.include_router(api_keys.router)
router.include_router(public.router)
router.include_router(docs.router)
router.include_router(notifications.router)
router.include_router(search.router)
router.include_router(audit.router)
router.include_router(settings.router)
router.include_router(dashboard.router)
router.include_router(bookmarks.router)
router.include_router(comments.router)
router.include_router(reels.router)
router.include_router(channels.router)
router.include_router(fun.router)
router.include_router(rss.router)
router.include_router(article_analytics.router)
router.include_router(revisions.router)

# --- API PLATFORM ---
router.include_router(developer_router)
router.include_router(developers_admin.router)
