"""Share card generation service."""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

import httpx
from PIL import Image, ImageDraw, ImageFont

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def generate_share_card(title: str, source_name: str | None, image_url: str | None, base_url: str) -> str | None:
    """Generate a shareable 1080x1080 image card for an article."""
    
    try:
        width, height = 1080, 1080
        background_color = (10, 14, 33)  # #0A0E21
        
        img = Image.new("RGB", (width, height), color=background_color)
        draw = ImageDraw.Draw(img)
        
        # In a real app we'd load a TTF font, using default for now due to environment constraints
        font = ImageFont.load_default()
        
        # Center title (simplistic wrapping for default font)
        words = title.split()
        lines = []
        current_line = []
        for word in words:
            current_line.append(word)
            if len(" ".join(current_line)) > 30:
                lines.append(" ".join(current_line[:-1]))
                current_line = [word]
        lines.append(" ".join(current_line))
        
        y_text = 400
        for line in lines:
            # Note: with default font text might be small, 
            # ideally we'd use ImageFont.truetype()
            draw.text((100, y_text), line, font=font, fill=(255, 255, 255))
            y_text += 50
            
        # Draw source name
        if source_name:
            draw.text((100, y_text + 20), source_name, font=font, fill=(150, 150, 150))
            
        # Draw branding at bottom
        draw.text((100, 950), "Daily News Hub", font=font, fill=(226, 59, 59))  # #E23B3B
        
        filename = f"share_{uuid4().hex}.jpg"
        uploads_dir = Path(settings.UPLOADS_DIR)
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = uploads_dir / filename
        img.save(file_path, "JPEG")
        
        return f"{base_url.rstrip('/')}/media/{filename}"
        
    except Exception as exc:
        logger.error(f"Failed to generate share card: {exc}")
        return None
