"""User management routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.email_registry import email_in_use
from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission, require_role
from app.core.security import get_password_hash, validate_password_strength
from app.models.device_token import DeviceToken
from app.models.permission import UserRole
from app.models.user import User
from app.schemas.v2.user import (
    AssignRolesRequest,
    ChangeStatusRequest,
    RoleSummary,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.core.dependencies_v2 import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users-v2"])


def _paginate(items: list[object], total: int, page: int, limit: int) -> dict[str, object]:
    pages = (total + limit - 1) // limit if total else 0
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


class DeviceTokenRequest(BaseModel):
    """Payload for registering a Firebase device token."""

    fcm_token: str = Field(min_length=1, max_length=512)
    platform: Literal["ios", "android"] = "android"


def _to_user_response(user: User) -> dict[str, Any]:
    roles = [RoleSummary(id=ur.role.id, name=ur.role.name) for ur in user.user_roles if ur.role]
    return UserResponse(
        id=user.id,
        name=user.name,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        avatar_url=user.avatar_url,
        country=user.country,
        state=user.state,
        phone_number=user.phone_number,
        is_active=user.is_active,
        is_admin=user.is_admin,
        roles=roles,
        created_at=user.created_at,
        updated_at=user.updated_at,
    ).model_dump(mode="json")


@router.get("")
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    search: str = Query(default="", max_length=200),
    role: str | None = Query(default=None, max_length=100),
    current_user: User = Depends(require_permission("user:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """List users with pagination, search, and optional role filter."""
    query = select(User).options(selectinload(User.user_roles).selectinload(UserRole.role))
    count_query = select(func.count(User.id))

    if search:
        pattern = f"%{search}%"
        query = query.where(User.name.ilike(pattern) | User.email.ilike(pattern))
        count_query = count_query.where(User.name.ilike(pattern) | User.email.ilike(pattern))

    total = int(await db.scalar(count_query) or 0)
    result = await db.execute(query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit))
    users = [_to_user_response(u) for u in result.scalars().unique().all()]

    if role:
        users = [u for u in users if any(r["name"] == role for r in u["roles"])]

    return {"success": True, "message": "Users retrieved", "data": _paginate(users, total, page, limit)}


@router.get("/me")
async def get_me(
    current_user: User = Depends(require_role("reporter", "fact_checker", "validator", "chief_editor", "publisher", "auditor", "admin", "reader")),
) -> dict[str, Any]:
    """Get current authenticated user profile."""
    return {"success": True, "message": "User profile", "data": _to_user_response(current_user)}


@router.get("/{user_id}")
async def get_user(
    user_id: UUID,
    current_user: User = Depends(require_permission("user:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a specific user by ID."""
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"success": True, "message": "User retrieved", "data": _to_user_response(user)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    request: Request,
    current_user: User = Depends(require_permission("user:create")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Admin creates a new user with optional role assignments."""
    # --- API PLATFORM ---
    validate_password_strength(body.password)

    if await email_in_use(db, body.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=get_password_hash(body.password),
        is_active=body.is_active,
        is_admin=body.is_admin,
    )
    db.add(user)
    await db.flush()

    for role_id in body.role_ids:
        db.add(UserRole(user_id=user.id, role_id=role_id))

    await log_audit(
        db,
        action="user:create",
        resource_type="user",
        user_id=current_user.id,
        resource_id=user.id,
        changes={"email": body.email, "roles": [str(rid) for rid in body.role_ids]},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user.id)
    )
    user = result.scalar_one()
    logger.info("User created by %s: %s (%s)", current_user.email, user.email, user.id)

    return {"success": True, "message": "User created", "data": _to_user_response(user)}


@router.put("/{user_id}")
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    request: Request,
    current_user: User = Depends(require_permission("user:edit")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Admin updates a user."""
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    changes: dict[str, Any] = {}
    if body.name is not None:
        user.name = body.name
        changes["name"] = body.name
    if body.email is not None:
        # --- API PLATFORM ---
        if await email_in_use(db, body.email, exclude_user_id=user.id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        user.email = body.email
        changes["email"] = body.email
    if body.is_active is not None:
        user.is_active = body.is_active
        changes["is_active"] = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin
        changes["is_admin"] = body.is_admin
    if body.password is not None:
        validate_password_strength(body.password)
        user.password_hash = get_password_hash(body.password)
        changes["password"] = "[REDACTED]"

    await log_audit(
        db,
        action="user:update",
        resource_type="user",
        user_id=current_user.id,
        resource_id=user.id,
        changes=changes or None,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)

    return {"success": True, "message": "User updated", "data": _to_user_response(user)}


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("user:delete")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Admin deletes a user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await log_audit(db, "user:delete", "user", current_user.id, {"deleted_id": str(user.id)}, request.client.host if request.client else None)
    await db.delete(user)
    await db.commit()

    return {"success": True, "message": "User deleted"}


@router.post("/me/device-token", status_code=status.HTTP_201_CREATED)
async def register_device_token(
    payload: DeviceTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Register or update the current user's FCM device token."""

    device_token = await db.scalar(select(DeviceToken).where(DeviceToken.fcm_token == payload.fcm_token))
    if device_token is None:
        device_token = DeviceToken(user_id=current_user.id, fcm_token=payload.fcm_token, platform=payload.platform)
        db.add(device_token)
    else:
        device_token.user_id = current_user.id
        device_token.platform = payload.platform

    await db.commit()
    await db.refresh(device_token)
    return {
        "success": True,
        "message": "Device token registered successfully",
        "data": {
            "id": str(device_token.id),
            "user_id": str(device_token.user_id),
            "fcm_token": device_token.fcm_token,
            "platform": device_token.platform,
            "created_at": device_token.created_at,
            "updated_at": device_token.updated_at,
        },
    }


@router.patch("/{user_id}/status")
async def change_user_status(
    user_id: UUID,
    body: ChangeStatusRequest,
    request: Request,
    current_user: User = Depends(require_permission("user:edit")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Activate or deactivate a user."""
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = body.is_active

    await log_audit(
        db,
        action="user:status_change",
        resource_type="user",
        user_id=current_user.id,
        resource_id=user.id,
        changes={"is_active": body.is_active},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)

    return {"success": True, "message": "User status updated", "data": _to_user_response(user)}


@router.patch("/{user_id}/roles")
async def assign_roles(
    user_id: UUID,
    body: AssignRolesRequest,
    request: Request,
    current_user: User = Depends(require_permission("user:assign_role")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Replace all roles for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing_roles = await db.execute(select(UserRole).where(UserRole.user_id == user_id))
    for ur in existing_roles.scalars().all():
        await db.delete(ur)

    for role_id in body.role_ids:
        db.add(UserRole(user_id=user_id, role_id=role_id))

    await log_audit(
        db,
        action="user:assign_roles",
        resource_type="user",
        user_id=current_user.id,
        resource_id=user.id,
        changes={"role_ids": [str(rid) for rid in body.role_ids]},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user_id)
    )
    user = result.scalar_one()

    return {"success": True, "message": "Roles assigned", "data": _to_user_response(user)}
