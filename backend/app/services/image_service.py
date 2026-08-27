import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings

UPLOAD_URL_PREFIX = "/uploads/menu"

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _menu_images_dir() -> Path:
    settings = get_settings()
    path = Path(settings.upload_dir) / "menu"
    return path


def ensure_upload_dirs() -> None:
    _menu_images_dir().mkdir(parents=True, exist_ok=True)


def _sniff_image_type(data: bytes) -> str | None:
    """Return the canonical extension based on file content, or None.

    The client-supplied filename and Content-Type header are never trusted;
    the magic bytes decide whether an upload is a real JPEG/PNG/WebP.
    """
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


async def validate_and_save_image(upload: UploadFile) -> str:
    """Validate an uploaded image and persist it under a generated name.

    Returns the public URL path to store in the database.
    Raises ValueError with a user-safe message on any validation failure.
    """
    extension = (upload.filename or "").rsplit(".", 1)[-1].lower() if upload.filename and "." in upload.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported image format. Allowed: JPEG, PNG, WebP.")

    if (upload.content_type or "").split(";")[0].strip().lower() not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Unsupported image format. Allowed: JPEG, PNG, WebP.")

    settings = get_settings()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    data = await upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ValueError(f"Image exceeds the maximum size of {settings.max_upload_size_mb} MB.")

    sniffed = _sniff_image_type(data)
    if sniffed is None:
        raise ValueError("File content is not a valid JPEG, PNG, or WebP image.")
    if sniffed == "jpg" and extension not in {"jpg", "jpeg"}:
        raise ValueError("Image content does not match its file extension.")
    if sniffed != "jpg" and sniffed != extension:
        raise ValueError("Image content does not match its file extension.")

    safe_name = f"{uuid.uuid4().hex}{'.webp' if sniffed == 'webp' else '.' + sniffed}"
    target = _menu_images_dir() / safe_name
    target.write_bytes(data)
    return f"{UPLOAD_URL_PREFIX}/{safe_name}"


def delete_managed_image(image_url: str | None) -> None:
    """Delete a managed menu image file, ignoring foreign or unsafe paths."""
    if not image_url or not image_url.startswith(f"{UPLOAD_URL_PREFIX}/"):
        return

    menu_dir = _menu_images_dir().resolve()
    candidate = (menu_dir / image_url.rsplit("/", 1)[-1]).resolve()
    if candidate.parent != menu_dir:
        return

    candidate.unlink(missing_ok=True)
