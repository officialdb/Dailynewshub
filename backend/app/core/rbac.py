"""Role-Based Access Control dependencies for FastAPI."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import Depends, HTTPException, status

from app.core.dependencies_v2 import get_current_user

if TYPE_CHECKING:
    from app.models.user import User


def _get_role_names(user: User) -> set[str]:
    """Extract role names from a user's assigned roles."""
    return {ur.role.name for ur in user.user_roles if ur.role}


def _get_permission_names(user: User) -> set[str]:
    """Extract all permission names from a user's assigned roles."""
    perms: set[str] = set()
    for ur in user.user_roles:
        if ur.role:
            for rp in ur.role.permissions:
                if rp.permission:
                    perms.add(rp.permission.name)
    return perms


def require_role(*role_names: str):
    """Dependency: require the user to have at least one of the given roles.

    Usage:
        @router.get("/endpoint")
        async def endpoint(user: User = Depends(require_role("admin", "editor"))):
            ...
    """

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = _get_role_names(current_user)
        if current_user.is_admin:
            return current_user
        if not user_roles.intersection(set(role_names)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(role_names)}",
            )
        return current_user

    return _checker


def require_permission(permission_name: str):
    """Dependency: require the user to have a specific permission.

    Usage:
        @router.post("/articles")
        async def create_article(user: User = Depends(require_permission("article:create"))):
            ...
    """

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_admin:
            return current_user
        user_perms = _get_permission_names(current_user)
        if permission_name not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires permission: {permission_name}",
            )
        return current_user

    return _checker


def has_role(user: User, role_name: str) -> bool:
    """Check if a user has a specific role (non-raising)."""
    if user.is_admin:
        return True
    return role_name in _get_role_names(user)


def has_permission(user: User, permission: str) -> bool:
    """Check if a user has a specific permission (non-raising)."""
    if user.is_admin:
        return True
    return permission in _get_permission_names(user)
