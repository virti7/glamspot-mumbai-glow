"""Image preprocessing utilities for face detection improvement.

Provides dimension-preserving pixel operations (CLAHE, gamma
correction, unsharp-mask sharpening) and a strategy builder that
generates an ordered list of (preprocessed_image, strategy_name)
tuples based on a :class:`FaceDetectionConfig`.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.config.face_detection import FaceDetectionConfig


# ---------------------------------------------------------------------------
# Individual preprocessing operations
# ---------------------------------------------------------------------------


def apply_clahe(
    image: np.ndarray,
    clip_limit: float = 2.0,
    grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Apply Contrast Limited Adaptive Histogram Equalisation.

    Enhances local contrast, especially beneficial for low-contrast
    or poorly-lit images. The operation is dimension-preserving.

    Args:
        image: BGR image.
        clip_limit: CLAHE clip limit (higher = more contrast).
        grid_size: (rows, cols) for tile grid.

    Returns:
        CLAHE-enhanced BGR image.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=grid_size)
    l_eq = clahe.apply(l_ch)
    merged = cv2.merge([l_eq, a_ch, b_ch])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def apply_gamma(image: np.ndarray, gamma: float = 1.2) -> np.ndarray:
    """Apply gamma correction.

    ``gamma < 1`` brightens dark regions; ``gamma > 1`` darkens
    bright regions.

    Args:
        image: BGR image.
        gamma: Gamma value.

    Returns:
        Gamma-corrected BGR image.
    """
    inv_gamma = 1.0 / max(gamma, 0.01)
    table = np.array(
        [((i / 255.0) ** inv_gamma) * 255 for i in range(256)],
        dtype=np.uint8,
    )
    return cv2.LUT(image, table)


def apply_sharpening(image: np.ndarray, strength: float = 1.0) -> np.ndarray:
    """Apply unsharp-mask sharpening.

    Args:
        image: BGR image.
        strength: Sharpening intensity (0 = no effect, 1 = default).

    Returns:
        Sharpened BGR image.
    """
    blurred = cv2.GaussianBlur(image, (0, 0), 1.0)
    sharpened = cv2.addWeighted(image, 1.0 + strength, blurred, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def resize_if_large(
    image: np.ndarray,
    max_size: int = 640,
) -> np.ndarray:
    """Downscale an image if its largest dimension exceeds ``max_size``.

    Preserves aspect ratio.

    Args:
        image: Input image.
        max_size: Maximum allowed pixel value for the larger dimension.

    Returns:
        Resized image (or the original if already within limits).
    """
    h, w = image.shape[:2]
    max_dim = max(w, h)
    if max_dim <= max_size:
        return image
    ratio = max_size / max_dim
    new_w = int(w * ratio)
    new_h = int(h * ratio)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


# ---------------------------------------------------------------------------
# Strategy builder
# ---------------------------------------------------------------------------


def build_strategies(
    image: np.ndarray,
    config: FaceDetectionConfig,
) -> list[tuple[np.ndarray, str]]:
    """Produce an ordered list of (preprocessed_image, strategy_name).

    The first entry corresponds to ``config.primary_strategy``,
    followed by each strategy in ``config.fallback_strategies``.
    Only unique, non-duplicate strategy names are included.

    Args:
        image: Original BGR image.
        config: Face-detection configuration.

    Returns:
        List of (image, strategy_name) tuples.
    """
    seen: set[str] = set()
    strategies: list[tuple[np.ndarray, str]] = []

    names: list[str] = [config.primary_strategy]
    for name in config.fallback_strategies:
        if name not in names:
            names.append(name)

    for name in names:
        if name in seen:
            continue
        seen.add(name)

        preprocessed = _apply_strategy(image, name, config)
        strategies.append((preprocessed, name))

    return strategies


def _apply_strategy(
    image: np.ndarray,
    strategy: str,
    config: FaceDetectionConfig,
) -> np.ndarray:
    """Apply a named preprocessing strategy to the image.

    Args:
        image: Original BGR image.
        strategy: Strategy name.
        config: Current face-detection config.

    Returns:
        Preprocessed image.
    """
    if strategy == "original":
        img = image.copy()
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy == "clahe":
        img = apply_clahe(image, config.clahe_clip_limit, config.clahe_grid_size)
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy == "gamma":
        img = apply_gamma(image, config.gamma_value)
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy == "sharpening":
        img = apply_sharpening(image)
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy in ("clahe+gamma", "clahe_gamma"):
        img = apply_clahe(image, config.clahe_clip_limit, config.clahe_grid_size)
        img = apply_gamma(img, config.gamma_value)
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy in ("clahe+sharpening", "clahe_sharp"):
        img = apply_clahe(image, config.clahe_clip_limit, config.clahe_grid_size)
        img = apply_sharpening(img)
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy == "low_threshold":
        img = image.copy()
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size)
        return img

    if strategy in ("large_det_size", "clahe+large"):
        img = image.copy()
        if config.resize_before_detection:
            img = resize_if_large(img, config.target_size * 2)
        return img

    return image.copy()
