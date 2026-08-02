"""Seed script for system roles and permissions.

Run manually:
    cd backend && python -m app.core.seed_rbac
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session_v2 import AsyncSessionLocalV2
from app.models.permission import Permission, RolePermission
from app.models.role import Role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYSTEM_ROLES = {
    "reporter": "Creates and edits news articles, submits for review",
    "fact_checker": "Verifies sources and factual accuracy of articles",
    "validator": "Editorial review — grammar, formatting, legal, standards",
    "chief_editor": "Final editorial approval, assignments, oversight",
    "publisher": "Publishes approved articles, schedules, unpublishes",
    "auditor": "Monitors activities, views audit logs, ensures compliance",
    "admin": "Full system access — manage users, roles, settings",
    "reader": "Read published news, comment, bookmark, share",
}

PERMISSIONS: list[dict[str, str]] = [
    # Article lifecycle
    {"name": "article:create", "resource": "article", "action": "create", "description": "Create new articles"},
    {"name": "article:edit_own", "resource": "article", "action": "edit_own", "description": "Edit own articles"},
    {"name": "article:edit_any", "resource": "article", "action": "edit_any", "description": "Edit any article"},
    {"name": "article:delete_own", "resource": "article", "action": "delete_own", "description": "Delete own draft articles"},
    {"name": "article:delete_any", "resource": "article", "action": "delete_any", "description": "Delete any article"},
    {"name": "article:view_own", "resource": "article", "action": "view_own", "description": "View own articles"},
    {"name": "article:view_all", "resource": "article", "action": "view_all", "description": "View all articles"},
    {"name": "article:submit", "resource": "article", "action": "submit", "description": "Submit article for review"},
    {"name": "article:withdraw", "resource": "article", "action": "withdraw", "description": "Withdraw submission"},
    {"name": "article:assign", "resource": "article", "action": "assign", "description": "Assign article to reviewer"},
    {"name": "article:approve", "resource": "article", "action": "approve", "description": "Approve article"},
    {"name": "article:reject", "resource": "article", "action": "reject", "description": "Reject article"},
    {"name": "article:revision", "resource": "article", "action": "revision", "description": "Request revision"},
    {"name": "article:publish", "resource": "article", "action": "publish", "description": "Publish article"},
    {"name": "article:schedule", "resource": "article", "action": "schedule", "description": "Schedule article"},
    {"name": "article:unpublish", "resource": "article", "action": "unpublish", "description": "Unpublish article"},
    {"name": "article:archive", "resource": "article", "action": "archive", "description": "Archive article"},
    {"name": "article:breaking", "resource": "article", "action": "breaking", "description": "Mark as breaking news"},
    {"name": "article:feature", "resource": "article", "action": "feature", "description": "Mark as featured"},

    # Fact checking
    {"name": "factcheck:view", "resource": "factcheck", "action": "view", "description": "View fact check queue"},
    {"name": "factcheck:verify", "resource": "factcheck", "action": "verify", "description": "Verify article facts"},
    {"name": "factcheck:flag", "resource": "factcheck", "action": "flag", "description": "Flag misinformation"},
    {"name": "factcheck:request_evidence", "resource": "factcheck", "action": "request_evidence", "description": "Request evidence from reporter"},

    # Validation
    {"name": "validation:view", "resource": "validation", "action": "view", "description": "View validation queue"},
    {"name": "validation:review", "resource": "validation", "action": "review", "description": "Review article for editorial standards"},

    # User management
    {"name": "user:create", "resource": "user", "action": "create", "description": "Create users"},
    {"name": "user:view", "resource": "user", "action": "view", "description": "View users"},
    {"name": "user:edit", "resource": "user", "action": "edit", "description": "Edit users"},
    {"name": "user:delete", "resource": "user", "action": "delete", "description": "Delete users"},
    {"name": "user:assign_role", "resource": "user", "action": "assign_role", "description": "Assign roles to users"},

    # Role management
    {"name": "role:manage", "resource": "role", "action": "manage", "description": "Create, edit, delete roles and permissions"},

    # Category & tag management
    {"name": "category:manage", "resource": "category", "action": "manage", "description": "Manage categories"},
    {"name": "tag:manage", "resource": "tag", "action": "manage", "description": "Manage tags"},

    # Media
    {"name": "media:upload", "resource": "media", "action": "upload", "description": "Upload media files"},
    {"name": "media:delete", "resource": "media", "action": "delete", "description": "Delete media files"},

    # Audit
    {"name": "audit:view", "resource": "audit", "action": "view", "description": "View audit logs"},
    {"name": "audit:export", "resource": "audit", "action": "export", "description": "Export audit logs"},

    # Analytics
    {"name": "analytics:view", "resource": "analytics", "action": "view", "description": "View analytics dashboard"},

    # Notifications
    {"name": "notification:send", "resource": "notification", "action": "send", "description": "Send notifications"},

    # System
    {"name": "system:settings", "resource": "system", "action": "settings", "description": "Manage system settings"},
    {"name": "system:backup", "resource": "system", "action": "backup", "description": "Backup and restore"},

    # API keys
    {"name": "apikey:manage", "resource": "apikey", "action": "manage", "description": "Manage API keys"},

    # Reader actions
    {"name": "article:read", "resource": "article", "action": "read", "description": "Read published articles"},
    {"name": "comment:create", "resource": "comment", "action": "create", "description": "Create comments"},
    {"name": "bookmark:manage", "resource": "bookmark", "action": "manage", "description": "Manage bookmarks"},
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "reporter": [
        "article:create", "article:edit_own", "article:delete_own",
        "article:view_own", "article:submit", "article:withdraw",
        "media:upload", "article:read", "comment:create", "bookmark:manage",
    ],
    "fact_checker": [
        "article:view_all", "factcheck:view", "factcheck:verify",
        "factcheck:flag", "factcheck:request_evidence",
        "article:read", "comment:create", "bookmark:manage",
    ],
    "validator": [
        "article:view_all", "validation:view", "validation:review",
        "article:approve", "article:reject", "article:revision",
        "article:read", "comment:create", "bookmark:manage",
    ],
    "chief_editor": [
        "article:create", "article:edit_any", "article:view_all",
        "article:assign", "article:approve", "article:reject",
        "article:revision", "article:breaking", "article:feature",
        "article:read", "comment:create", "bookmark:manage",
        "notification:send",
    ],
    "publisher": [
        "article:view_all", "article:publish", "article:schedule",
        "article:unpublish", "article:archive",
        "article:read", "comment:create", "bookmark:manage",
        "notification:send",
    ],
    "auditor": [
        "article:view_all", "audit:view", "audit:export",
        "analytics:view",
        "article:read", "bookmark:manage",
    ],
    "admin": [p["name"] for p in PERMISSIONS],
    "reader": [
        "article:read", "comment:create", "bookmark:manage",
    ],
}


async def seed() -> None:
    """Seed system roles and permissions."""
    async with AsyncSessionLocalV2() as db:
        await _seed_permissions(db)
        await _seed_roles(db)
        await _seed_role_permissions(db)
        await db.commit()
        logger.info("Seed completed successfully.")


async def _seed_permissions(db: AsyncSession) -> None:
    """Create all permissions if they don't exist."""
    for perm_data in PERMISSIONS:
        result = await db.execute(select(Permission).where(Permission.name == perm_data["name"]))
        if result.scalar_one_or_none() is None:
            db.add(Permission(**perm_data))
            logger.info("Created permission: %s", perm_data["name"])
    await db.flush()


async def _seed_roles(db: AsyncSession) -> None:
    """Create system roles if they don't exist."""
    for name, description in SYSTEM_ROLES.items():
        result = await db.execute(select(Role).where(Role.name == name))
        if result.scalar_one_or_none() is None:
            db.add(Role(name=name, description=description, is_system=True))
            logger.info("Created role: %s", name)
    await db.flush()


async def _seed_role_permissions(db: AsyncSession) -> None:
    """Assign permissions to roles."""
    for role_name, perm_names in ROLE_PERMISSIONS.items():
        role_result = await db.execute(select(Role).where(Role.name == role_name))
        role = role_result.scalar_one_or_none()
        if role is None:
            continue

        for perm_name in perm_names:
            perm_result = await db.execute(select(Permission).where(Permission.name == perm_name))
            perm = perm_result.scalar_one_or_none()
            if perm is None:
                continue

            existing = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id,
                )
            )
            if existing.scalar_one_or_none() is None:
                db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                logger.info("Assigned %s → %s", perm_name, role_name)
    await db.flush()


if __name__ == "__main__":
    asyncio.run(seed())
