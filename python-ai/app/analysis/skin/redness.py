"""Facial redness estimation using LAB a*-channel analysis.

Compares the a* (red–green) distribution of skin pixels against
baseline thresholds. Deterministic heuristic — replaceable by a
dedicated model.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

_SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (0.3, "None"),
    (1.0, "Low"),
    (2.5, "Moderate"),
    (float("inf"), "High"),
]


@dataclass
class RednessResult:
    """Redness analysis result.

    Attributes:
        severity: ``None``, ``Low``, ``Moderate``, or ``High``.
        confidence: Confidence in the classification (0–100).
    """

    severity: str
    confidence: float


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,
    landmarks: list[list[float]],  # noqa: ARG001
    skintone: SkintoneResult,       # noqa: ARG001
) -> RednessResult:
    """Estimate facial redness severity from the LAB a* channel.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean mask of skin pixels.
        landmarks: 468 MediaPipe landmark pixel coordinates (unused).
        skintone: Skin-tone classification (unused).

    Returns:
        :class:`RednessResult` with severity and confidence.
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean_mask = cv2.erode(skin_mask.astype(np.uint8), kernel, iterations=1)

    lab = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2LAB)
    a_channel = lab[:, :, 1].astype(np.float32)

    skin_a = a_channel[clean_mask > 0]
    if skin_a.size == 0:
        return RednessResult(severity="None", confidence=0.0)

    a_mean = float(skin_a.mean())
    a_std = float(skin_a.std())

    # Normal: a* ~ 8–16 for most skin tones
    # Elevated a* → redness; compute how far above the skin's own baseline
    redness_thresh = a_mean + 1.0 * max(a_std, 2.0)
    red_pixels = (a_channel > redness_thresh).astype(np.uint8) * 255
    red_pixels = cv2.bitwise_and(red_pixels, red_pixels, mask=clean_mask)

    red_area = int(np.count_nonzero(red_pixels))
    total_skin = int(clean_mask.sum())
    redness_coverage = red_area / max(total_skin, 1) * 100.0

    # Also compute mean elevation above baseline
    elevated = a_channel[clean_mask > 0] - a_mean
    mean_elevation = float(elevated[elevated > 0].mean()) if elevated.max() > 0 else 0.0

    # Blend coverage and intensity for the final score
    red_score = redness_coverage * 0.4 + mean_elevation * 5.0
    severity = _classify_severity(red_score)
    confidence = _compute_confidence(red_score, a_std)

    return RednessResult(severity=severity, confidence=round(confidence, 1))


def _classify_severity(score: float) -> str:
    for threshold, label in _SEVERITY_THRESHOLDS:
        if score <= threshold:
            return label
    return "High"


def _compute_confidence(score: float, std: float) -> float:
    if score < 0.3:
        return 100.0
    base = min(100.0, score * 20.0)
    # Lower variance in redness distribution → more reliable
    variance_penalty = min(30.0, std * 3.0)
    return min(100.0, base + (100.0 - base) * (1.0 - variance_penalty / 100.0))
