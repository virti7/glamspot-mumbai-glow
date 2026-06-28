"""Pigmentation-spot detection using LAB colour-space analysis.

Uses L* and a*/b* thresholds to identify hyperpigmented regions
relative to the surrounding skin. Deterministic heuristic —
replaceable by a dedicated model.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

_MIN_PIGMENT_AREA = 10   # minimum spot size in pixels
_SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (0.5, "None"),
    (3.0, "Mild"),
    (8.0, "Moderate"),
    (float("inf"), "Severe"),
]


@dataclass
class PigmentationResult:
    """Pigmentation analysis result.

    Attributes:
        severity: ``None``, ``Mild``, ``Moderate``, or ``Severe``.
        confidence: Confidence in the classification (0–100).
    """

    severity: str
    confidence: float


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,
    landmarks: list[list[float]],  # noqa: ARG001
    skintone: SkintoneResult,       # noqa: ARG001
) -> PigmentationResult:
    """Estimate hyperpigmentation severity from skin LAB statistics.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean mask of skin pixels.
        landmarks: 468 MediaPipe landmark pixel coordinates (unused).
        skintone: Skin-tone classification (unused).

    Returns:
        :class:`PigmentationResult` with severity and confidence.
    """
    # Clean the mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean_mask = cv2.erode(skin_mask.astype(np.uint8), kernel, iterations=1)

    lab = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].astype(np.float32)

    # Only analyse skin pixels
    skin_L = L[clean_mask > 0]
    if skin_L.size == 0:
        return PigmentationResult(severity="None", confidence=0.0)

    L_mean = skin_L.mean()
    L_std = skin_L.std()

    # Pixels significantly darker than the mean are potential spots
    dark_thresh = L_mean - 1.2 * max(L_std, 3.0)
    dark_mask = (L < dark_thresh).astype(np.uint8) * 255
    dark_mask = cv2.bitwise_and(dark_mask, dark_mask, mask=clean_mask)

    # Also detect brown spots using a* and b* (elevated a* + elevated b*)
    a_channel = lab[:, :, 1].astype(np.float32)
    b_channel = lab[:, :, 2].astype(np.float32)
    skin_a = a_channel[clean_mask > 0]
    skin_b = b_channel[clean_mask > 0]
    a_mean = skin_a.mean()
    b_mean = skin_b.mean()
    # Brown spots tend to have higher a* and b* simultaneously
    brown_mask = (
        (a_channel > a_mean + 0.8 * max(skin_a.std(), 2.0))
        & (b_channel > b_mean + 0.8 * max(skin_b.std(), 2.0))
    ).astype(np.uint8) * 255
    brown_mask = cv2.bitwise_and(brown_mask, brown_mask, mask=clean_mask)

    # Combine dark and brown detections
    combined = cv2.bitwise_or(dark_mask, brown_mask)
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(
        combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )
    spots = [c for c in contours if cv2.contourArea(c) >= _MIN_PIGMENT_AREA]

    # Coverage percentage
    total_skin = int(clean_mask.sum())
    spot_area = sum(int(cv2.contourArea(c)) for c in spots)
    coverage = spot_area / max(total_skin, 1) * 100.0

    severity = _classify_severity(coverage)
    confidence = _compute_confidence(coverage, len(spots))

    return PigmentationResult(severity=severity, confidence=round(confidence, 1))


def _classify_severity(coverage: float) -> str:
    for threshold, label in _SEVERITY_THRESHOLDS:
        if coverage <= threshold:
            return label
    return "Severe"


def _compute_confidence(coverage: float, count: int) -> float:
    if coverage < 0.5:
        return 100.0
    # Higher coverage and more spots → higher confidence
    base = min(100.0, coverage * 10.0)
    count_factor = min(100.0, count * 5.0)
    return min(100.0, base * 0.6 + count_factor * 0.4)
