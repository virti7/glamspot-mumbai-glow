"""Acne spot detection using blob analysis on the skin region.

Deterministic heuristic based on contrast thresholding and contour
analysis. Designed to be replaced by a deep-learning model later.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

_MIN_SPOT_AREA = 6       # pixels (≈3 px diameter)
_MAX_SPOT_AREA = 200     # pixels – ignore large regions (shadows etc.)
_SEVERITY_THRESHOLDS: list[tuple[int, str]] = [
    (0, "None"),
    (3, "Mild"),
    (8, "Moderate"),
    (float("inf"), "Severe"),
]


@dataclass
class AcneResult:
    """Acne analysis result.

    Attributes:
        severity: ``None``, ``Mild``, ``Moderate``, or ``Severe``.
        count: Number of detected spots.
        confidence: Confidence in the classification (0–100).
    """

    severity: str
    count: int
    confidence: float


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,
    landmarks: list[list[float]],  # noqa: ARG001
    skintone: SkintoneResult,       # noqa: ARG001
) -> AcneResult:
    """Detect potential acne spots on the skin region.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean mask of skin pixels (same shape as
            *aligned_bgr*).
        landmarks: 468 MediaPipe landmark pixel coordinates
            (unused in the heuristic implementation).
        skintone: Skin-tone classification result (unused in the
            heuristic implementation).

    Returns:
        :class:`AcneResult` with severity, spot count, and confidence.
    """
    # Erode the skin mask slightly to avoid boundary artifacts
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean_mask = cv2.erode(skin_mask.astype(np.uint8), kernel, iterations=1)

    # Skin-only grayscale
    gray = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2GRAY)
    skin_gray = cv2.bitwise_and(gray, gray, mask=clean_mask)

    # CLAHE + median blur for contrast normalization
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(skin_gray)
    blurred = cv2.medianBlur(enhanced, 5)

    # Adaptive threshold to locate darker spots
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 21, 6,
    )
    # Keep only skin-region detections
    thresh = cv2.bitwise_and(thresh, thresh, mask=clean_mask)

    # Also detect reddish spots via the a* channel (LAB)
    lab = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2LAB)
    a_channel = lab[:, :, 1]
    skin_a = cv2.bitwise_and(a_channel, a_channel, mask=clean_mask)
    a_mean = skin_a[clean_mask > 0].mean()
    a_std = skin_a[clean_mask > 0].std()
    red_spots = cv2.threshold(
        skin_a, int(a_mean + 1.5 * a_std), 255, cv2.THRESH_BINARY,
    )[1]
    red_spots = cv2.bitwise_and(red_spots, red_spots, mask=clean_mask)

    # Combine dark spots and red spots
    combined = cv2.bitwise_or(thresh, red_spots)

    # Morphological cleanup
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=1)
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(
        combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )

    # Filter by area
    spots = [
        c for c in contours
        if _MIN_SPOT_AREA <= cv2.contourArea(c) <= _MAX_SPOT_AREA
    ]
    count = len(spots)

    # Classify severity
    severity = _classify_severity(count)
    confidence = _compute_confidence(count, spots, combined)

    return AcneResult(severity=severity, count=count, confidence=round(confidence, 1))


def _classify_severity(count: int) -> str:
    for threshold, label in _SEVERITY_THRESHOLDS:
        if count <= threshold:
            return label
    return "Severe"


def _compute_confidence(count: int, contours: list, mask: np.ndarray) -> float:
    """Estimate confidence based on spot clarity and count."""
    if count == 0:
        return 100.0
    # Average contrast of spots vs. surrounding skin
    total_area = mask.sum()
    spot_area = sum(cv2.contourArea(c) for c in contours)
    spot_density = spot_area / max(total_area, 1)
    # Higher density of well-defined spots → higher confidence
    base = min(100.0, count * 10.0)
    density_factor = min(1.0, spot_density * 50.0)
    return min(100.0, base * 0.6 + density_factor * 40.0)
