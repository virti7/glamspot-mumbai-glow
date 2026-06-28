"""Pore visibility estimation using top-hat morphology and texture analysis.

Detects small circular depressions on the skin region via
grayscale morphology. Deterministic heuristic — replaceable by a
dedicated model.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

_MIN_PORE_AREA = 2
_MAX_PORE_AREA = 20
_VISIBILITY_THRESHOLDS: list[tuple[float, str]] = [
    (5.0, "Low"),
    (20.0, "Medium"),
    (float("inf"), "High"),
]


@dataclass
class PoresResult:
    """Pore visibility result.

    Attributes:
        visibility: ``Low``, ``Medium``, or ``High``.
        confidence: Confidence in the assessment (0–100).
    """

    visibility: str
    confidence: float


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,
    landmarks: list[list[float]],  # noqa: ARG001
    skintone: SkintoneResult,       # noqa: ARG001
) -> PoresResult:
    """Estimate pore visibility from skin texture analysis.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean mask of skin pixels.
        landmarks: 468 MediaPipe landmark pixel coordinates (unused).
        skintone: Skin-tone classification (unused).

    Returns:
        :class:`PoresResult` with visibility level and confidence.
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean_mask = cv2.erode(skin_mask.astype(np.uint8), kernel, iterations=1)

    gray = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2GRAY)
    skin_gray = cv2.bitwise_and(gray, gray, mask=clean_mask)

    # Top-hat transform: original - opening → highlights small dark structures
    morph_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    tophat = cv2.morphologyEx(skin_gray, cv2.MORPH_TOPHAT, morph_kernel)

    # Threshold to isolate pore-like dots
    _, thresh = cv2.threshold(tophat, 8, 255, cv2.THRESH_BINARY)
    thresh = cv2.bitwise_and(thresh, thresh, mask=clean_mask)

    # Morph cleanup
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(
        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )
    pores = [
        c for c in contours
        if _MIN_PORE_AREA <= cv2.contourArea(c) <= _MAX_PORE_AREA
    ]

    total_skin = int(clean_mask.sum())
    pore_area = sum(int(cv2.contourArea(c)) for c in pores)
    pore_density = pore_area / max(total_skin, 1) * 100.0

    # Also measure local texture variance as a secondary signal
    skin_region = gray[clean_mask > 0]
    texture_variance = float(skin_region.var()) if skin_region.size > 0 else 0.0
    var_score = min(100.0, texture_variance * 0.5)

    # Blend density and variance
    density_score = pore_density * 3.0
    blended = density_score * 0.6 + var_score * 0.4

    visibility = _classify_visibility(blended)
    confidence = _compute_confidence(blended, pore_density, len(pores))

    return PoresResult(visibility=visibility, confidence=round(confidence, 1))


def _classify_visibility(score: float) -> str:
    for threshold, label in _VISIBILITY_THRESHOLDS:
        if score <= threshold:
            return label
    return "High"


def _compute_confidence(score: float, density: float, count: int) -> float:
    if score < 5.0:
        return 100.0
    base = min(100.0, score * 3.0)
    count_factor = min(100.0, count * 2.0)
    return min(100.0, base * 0.5 + count_factor * 0.5)
