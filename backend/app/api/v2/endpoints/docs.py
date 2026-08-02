"""Public API documentation endpoint — no authentication required."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/docs", tags=["api-docs"])


@router.get("/")
async def api_documentation() -> dict[str, object]:
    """Return human-readable API documentation for external consumers."""
    return {
        "name": "Daily News Hub API",
        "version": "2.0",
        "base_url": "/api/v2",
        "authentication": {
            "method": "API Key",
            "header": "X-API-Key",
            "description": (
                "All public endpoints require a valid API key passed via the "
                "X-API-Key HTTP header. Contact the administrator to obtain a key."
            ),
        },
        "endpoints": {
            "articles": {
                "list": {
                    "method": "GET",
                    "path": "/api/v2/public/articles",
                    "description": "List published articles with pagination.",
                    "query_params": {
                        "page": {"type": "integer", "default": 1, "description": "Page number (≥ 1)."},
                        "limit": {"type": "integer", "default": 10, "description": "Items per page (1–100)."},
                        "category_slug": {"type": "string", "default": None, "description": "Filter by category slug."},
                    },
                    "response": {
                        "success": "boolean",
                        "message": "string",
                        "data": {
                            "items": "array of Article",
                            "total": "integer",
                            "page": "integer",
                            "limit": "integer",
                            "pages": "integer",
                        },
                    },
                },
                "get": {
                    "method": "GET",
                    "path": "/api/v2/public/articles/{article_id}",
                    "description": "Get a single published article by UUID. Increments view count.",
                    "path_params": {
                        "article_id": {"type": "UUID", "description": "The article's unique identifier."},
                    },
                    "response": {
                        "success": "boolean",
                        "message": "string",
                        "data": "Article",
                    },
                },
                "search": {
                    "method": "GET",
                    "path": "/api/v2/public/articles/search",
                    "description": "Search published articles by title and description.",
                    "query_params": {
                        "q": {"type": "string", "required": True, "description": "Search query (1–200 chars)."},
                        "page": {"type": "integer", "default": 1, "description": "Page number (≥ 1)."},
                        "limit": {"type": "integer", "default": 10, "description": "Items per page (1–100)."},
                    },
                    "response": {
                        "success": "boolean",
                        "message": "string",
                        "data": {
                            "items": "array of Article",
                            "total": "integer",
                            "page": "integer",
                            "limit": "integer",
                            "pages": "integer",
                        },
                    },
                },
            },
            "categories": {
                "list": {
                    "method": "GET",
                    "path": "/api/v2/public/categories",
                    "description": "List all available categories.",
                    "response": {
                        "success": "boolean",
                        "message": "string",
                        "data": "array of Category",
                    },
                },
            },
        },
        "models": {
            "Article": {
                "id": "string (UUID)",
                "title": "string",
                "description": "string",
                "content": "string",
                "image_url": "string | null",
                "author": "string",
                "source_name": "string",
                "category": "string | null",
                "published_at": "string (ISO 8601) | null",
                "view_count": "integer",
            },
            "Category": {
                "id": "string (UUID)",
                "name": "string",
                "slug": "string",
            },
        },
        "errors": {
            "400": "Bad request — invalid parameters.",
            "401": "Unauthorized — missing or invalid X-API-Key header.",
            "404": "Not found — the requested resource does not exist.",
            "429": "Too many requests — rate limit exceeded.",
        },
    }
