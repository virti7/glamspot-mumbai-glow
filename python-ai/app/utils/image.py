"""Image utility functions for validation, conversion, and encoding."""

import base64
from pathlib import Path

import cv2
import numpy as np
from fastapi import UploadFile
from loguru import logger

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_extension(filename: str) -> str:
    """Extract and normalise the file extension.

    Args:
        filename: Original filename from the uploaded file.

    Returns:
        Lowercase extension including the leading dot.

    Raises:
        ValueError: If the filename has no extension.
    """
    ext = Path(filename).suffix.lower()
    if not ext:
        raise ValueError("Uploaded file has no extension")
    return ext


def validate_image_extension(filename: str) -> None:
    """Check that the file extension is in the allowed set.

    Args:
        filename: Original filename to check.

    Raises:
        ValueError: If the extension is not supported.
    """
    ext = _get_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        logger.warning("Rejected unsupported extension: {ext}", ext=ext)
        raise ValueError(
            f"Unsupported file extension '{ext}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )


def validate_image_size(content: bytes) -> None:
    """Check that the image does not exceed the maximum file size.

    Args:
        content: Raw file bytes.

    Raises:
        ValueError: If the content exceeds MAX_FILE_SIZE.
    """
    if len(content) > MAX_FILE_SIZE:
        logger.warning("File exceeds size limit: {size} bytes", size=len(content))
        raise ValueError(
            f"File size exceeds the maximum allowed size of "
            f"{MAX_FILE_SIZE // (1024 * 1024)} MB"
        )


def validate_image(content: bytes, filename: str) -> None:
    """Run all validation checks on an uploaded image.

    Checks extension validity, file size, and attempts to decode
    the image to detect corruption.

    Args:
        content: Raw file bytes.
        filename: Original filename.

    Raises:
        ValueError: If any validation check fails.
    """
    validate_image_extension(filename)
    validate_image_size(content)

    nparr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Image is corrupted or in an unsupported format")


async def read_image(file: UploadFile) -> bytes:
    """Read the full content of an uploaded file into memory.

    Args:
        file: FastAPI UploadFile instance.

    Returns:
        Raw file bytes.
    """
    content = await file.read()
    if not content:
        raise ValueError("Uploaded file is empty")
    return content


def convert_to_numpy(content: bytes) -> np.ndarray:
    """Decode raw image bytes into an OpenCV BGR numpy array.

    Args:
        content: Raw image bytes (JPEG, PNG, WebP, etc.).

    Returns:
        Decoded image as a numpy ndarray in BGR order.

    Raises:
        ValueError: If decoding fails (corrupted or unsupported format).
    """
    nparr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Failed to decode image — file may be corrupted")
    return image


def get_image_dimensions(image: np.ndarray) -> tuple[int, int]:
    """Return the (width, height) of a numpy image array.

    Args:
        image: Image as a numpy ndarray (channels-last).

    Returns:
        Tuple of (width, height) in pixels.
    """
    height, width = image.shape[:2]
    return width, height


def encode_image_base64(image: np.ndarray, format: str = ".jpg") -> str:
    """Encode a numpy image array to a base64 data string.

    Args:
        image: Image as a numpy ndarray in BGR order.
        format: Output image format (``.jpg``, ``.png``, etc.).

    Returns:
        Base64-encoded string of the image.
    """
    success, buffer = cv2.imencode(format, image)
    if not success:
        raise ValueError(f"Failed to encode image to {format}")
    return base64.b64encode(buffer).decode("utf-8")
