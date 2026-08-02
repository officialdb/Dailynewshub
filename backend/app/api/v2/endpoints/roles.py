"""Role & permission management routes for the v2 NMS API."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_audit
from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission
from app.models.permission import Permission, RolePermission
from app.models.role import Role
from app.models.user import User
from app.schemas.v2.role import (
    AssignPermissionsRequest,
    PermissionResponse,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/roles", tags=["roles-v2"])


@router.get("")
async def list_roles(
    current_user: User = Depends(require_permission("user:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all roles with their permissions."""
    result = await db.execute(
        select(Role).options(
            selectinload(Role.permissions).selectinload(RolePermission.permission)
        ).order_by(Role.created_at)
    )
    roles = result.scalars().unique().all()

    # Build response manually to handle RolePermission -> Permission conversion
    data = []
    for r in roles:
        permissions = [
            PermissionResponse.model_validate(rp.permission).model_dump(mode="json")
            for rp in r.permissions
            if rp.permission
        ]
        data.append({
            "id": str(r.id),
            "name": r.name,
            "description": r.description,
            "is_system": r.is_system,
            "permissions": permissions,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })

    return {"success": True, "message": "Roles retrieved", "data": data}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_role(
    body: RoleCreate,
    request: Request,
    current_user: User = Depends(require_permission("role:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new custom role."""
    existing = await db.execute(select(Role).where(Role.name == body.name))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role name already exists")

    role = Role(name=body.name, description=body.description)
    db.add(role)

    await log_audit(
        db,
        action="role:create",
        resource_type="role",
        user_id=current_user.id,
        resource_id=role.id,
        changes={"name": body.name},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(role)

    return {"success": True, "message": "Role created", "data": RoleResponse.model_validate(role).model_dump(mode="json")}


@router.put("/{role_id}")
async def update_role(
    role_id: UUID,
    body: RoleUpdate,
    request: Request,
    current_user: User = Depends(require_permission("role:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update a role's name or description."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system and body.name is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot rename a system role")

    changes: dict[str, Any] = {}
    if body.name is not None:
        role.name = body.name
        changes["name"] = body.name
    if body.description is not None:
        role.description = body.description
        changes["description"] = body.description

    await log_audit(
        db,
        action="role:update",
        resource_type="role",
        user_id=current_user.id,
        resource_id=role.id,
        changes=changes or None,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(role)

    return {"success": True, "message": "Role updated", "data": RoleResponse.model_validate(role).model_dump(mode="json")}


@router.delete("/{role_id}")
async def delete_role(
    role_id: UUID,
    request: Request,
    current_user: User = Depends(require_permission("role:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a custom role (system roles cannot be deleted)."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.is_system:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a system role")

    await log_audit(
        db,
        action="role:delete",
        resource_type="role",
        user_id=current_user.id,
        resource_id=role.id,
        changes={"name": role.name},
        ip_address=request.client.host if request.client else None,
    )
    await db.delete(role)
    await db.commit()

    return {"success": True, "message": "Role deleted"}


@router.get("/permissions")
async def list_permissions(
    current_user: User = Depends(require_permission("user:view")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List all available permissions."""
    result = await db.execute(select(Permission).order_by(Permission.resource, Permission.action))
    permissions = result.scalars().all()
    data = [PermissionResponse.model_validate(p).model_dump(mode="json") for p in permissions]

    return {"success": True, "message": "Permissions retrieved", "data": data}


@router.post("/{role_id}/permissions")
async def assign_permissions(
    role_id: UUID,
    body: AssignPermissionsRequest,
    request: Request,
    current_user: User = Depends(require_permission("role:manage")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Replace all permissions for a role."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    existing = await db.execute(select(RolePermission).where(RolePermission.role_id == role_id))
    for rp in existing.scalars().all():
        await db.delete(rp)

    for perm_id in body.permission_ids:
        db.add(RolePermission(role_id=role_id, permission_id=perm_id))

    await log_audit(
        db,
        action="role:assign_permissions",
        resource_type="role",
        user_id=current_user.id,
        resource_id=role.id,
        changes={"permission_count": len(body.permission_ids)},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    result = await db.execute(
        select(Role).options(
            selectinload(Role.permissions).selectinload(RolePermission.permission)
        ).where(Role.id == role_id)
    )
    role = result.scalar_one()

    return {"success": True, "message": "Permissions assigned", "data": RoleResponse.model_validate(role).model_dump(mode="json")}
