"""Media upload routes for the v2 NMS API."""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_audit
from app.core.config import get_settings
from app.core.dependencies_v2 import get_db
from app.core.rbac import require_permission
from app.models.user import User
from app.schemas.v2.media import MediaUploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["media-v2"])

settings = get_settings()
uploads_root = Path(__file__).resolve().parents[4] / settings.UPLOADS_DIR
images_dir = uploads_root / "articles"
images_dir.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("media:upload")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upload an article image. Returns the public URL."""
    content_type = (file.content_type or "").lower()
    suffix = Path(file.filename or "").suffix.lower()

    if content_type not in ALLOWED_IMAGE_TYPES and suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type or suffix}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large (max {MAX_SIZE // (1024 * 1024)} MB)",
        )

    if suffix not in ALLOWED_EXTENSIONS:
        suffix = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }.get(content_type, ".jpg")

    filename = f"{uuid4().hex}{suffix}"
    destination = images_dir / filename
    destination.write_bytes(content)

    url = f"/media/articles/{filename}"

    await log_audit(
        db,
        action="media:upload",
        resource_type="media",
        user_id=current_user.id,
        changes={"filename": filename, "content_type": content_type, "size": len(content)},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    resp = MediaUploadResponse(
        url=url,
        filename=filename,
        content_type=content_type,
        size_bytes=len(content),
    )
    return {"success": True, "message": "Image uploaded", "data": resp.model_dump(mode="json")}


@router.delete("/{filename}")
async def delete_image(
    filename: str,
    request: Request,
    current_user: User = Depends(require_permission("media:delete")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete an uploaded image."""
    file_path = images_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_path.unlink()

    await log_audit(
        db,
        action="media:delete",
        resource_type="media",
        user_id=current_user.id,
        changes={"filename": filename},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    return {"success": True, "message": "Image deleted"}
