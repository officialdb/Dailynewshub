"""User profile routes."""

from __future__ import annotations

from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.core.security import get_password_hash
from app.models.article import Article
from app.models.device_token import DeviceToken
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.schemas.user import UserResponse, UserUpdate
from app.core.config import get_settings


router = APIRouter(prefix="/users", tags=["users"])
settings = get_settings()
uploads_root = Path(__file__).resolve().parents[4] / settings.UPLOADS_DIR
avatars_dir = uploads_root / "avatars"
avatars_dir.mkdir(parents=True, exist_ok=True)


class DeviceTokenRequest(BaseModel):
    """Payload for registering a Firebase device token."""

    fcm_token: str = Field(min_length=1, max_length=512)
    platform: Literal["ios", "android"] = "android"


class NotificationItemResponse(NotificationResponse):
    """Notification item as returned to the mobile inbox."""

    article_title: str | None = None


def _build_avatar_url(request: Request, filename: str) -> str:
    """Build a public avatar URL for a stored upload."""

    return f"{str(request.base_url).rstrip('/')}/media/avatars/{filename}"


@router.get("/me")
async def read_me(current_user: User = Depends(get_current_user)) -> dict[str, object]:
    """Return the authenticated user's profile."""

    return {
        "success": True,
        "message": "Profile retrieved successfully",
        "data": UserResponse.model_validate(current_user).model_dump(mode="json"),
    }


@router.put("/me")
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Update the authenticated user's profile."""

    update_data = payload.model_dump(exclude_unset=True)

    if "email" in update_data:
        duplicate = await db.scalar(select(User).where(User.email == update_data["email"], User.id != current_user.id))
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    password = update_data.pop("password", None)
    if password:
        current_user.password_hash = get_password_hash(password)

    for key, value in update_data.items():
        setattr(current_user, key, value)

    await db.commit()
    await db.refresh(current_user)
    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": UserResponse.model_validate(current_user).model_dump(mode="json"),
    }


@router.post("/me/avatar")
async def update_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Upload and attach a profile avatar for the current user."""

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif"}:
        content_type = (file.content_type or "").lower()
        if content_type == "image/jpeg":
            suffix = ".jpg"
        elif content_type == "image/png":
            suffix = ".png"
        elif content_type == "image/webp":
            suffix = ".webp"
        elif content_type == "image/gif":
            suffix = ".gif"
        elif content_type in {"image/heic", "image/heif"}:
            suffix = ".heic"
        else:
            suffix = ".jpg"

    filename = f"{uuid4().hex}{suffix}"
    destination = avatars_dir / filename
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    destination.write_bytes(content)

    current_user.avatar_url = _build_avatar_url(request, filename)
    await db.commit()
    await db.refresh(current_user)
    return {
        "success": True,
        "message": "Avatar uploaded successfully",
        "data": UserResponse.model_validate(current_user).model_dump(mode="json"),
    }


@router.post("/device-token", status_code=status.HTTP_201_CREATED)
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


@router.get("/me/notifications")
async def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return the latest broadcast notifications for the current user."""

    del current_user

    result = await db.execute(
        select(Notification, Article.title)
        .join(Article, Notification.article_id == Article.id, isouter=True)
        .order_by(Notification.sent_at.desc().nullslast(), Notification.created_at.desc())
        .limit(limit)
    )

    items = []
    for notification, article_title in result.all():
        item = NotificationItemResponse.model_validate(notification).model_dump(mode="json")
        item["article_title"] = article_title
        items.append(item)

    return {
        "success": True,
        "message": "Notifications retrieved successfully",
        "data": items,
    }
