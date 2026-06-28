"""Dark-circle estimation by comparing under-eye and cheek brightness.

Uses LAB L* values in the under-eye region versus a nearby cheek
reference area. Deterministic heuristic — replaceable by a
dedicated model.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

# MediaPipe indices
_LEFT_EYE_INNER = 33
_LEFT_EYE_OUTER = 133
_RIGHT_EYE_INNER = 263
_RIGHT_EYE_OUTER = 362
_NOSE_TIP = 1

_SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (0.04, "None"),
    (0.10, "Mild"),
    (0.18, "Moderate"),
    (float("inf"), "Severe"),
]


@dataclass
class DarkCirclesResult:
    """Dark-circle analysis result.

    Attributes:
        severity: ``None``, ``Mild``, ``Moderate``, or ``Severe``.
        confidence: Confidence in the classification (0–100).
    """

    severity: str
    confidence: float


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,
    landmarks: list[list[float]],
    skintone: SkintoneResult,  # noqa: ARG001
) -> DarkCirclesResult:
    """Estimate dark-circle severity by comparing under-eye to cheek skin.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean mask of skin pixels.
        landmarks: 468 MediaPipe landmark pixel coordinates.
        skintone: Skin-tone classification (unused).

    Returns:
        :class:`DarkCirclesResult` with severity and confidence.
    """
    lab = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].astype(np.float32)
    h, w = aligned_bgr.shape[:2]

    # Under-eye ROI centres
    lex = int((landmarks[_LEFT_EYE_INNER][0] + landmarks[_LEFT_EYE_OUTER][0]) / 2.0)
    ley = int((landmarks[_LEFT_EYE_INNER][1] + landmarks[_LEFT_EYE_OUTER][1]) / 2.0)
    rex = int((landmarks[_RIGHT_EYE_INNER][0] + landmarks[_RIGHT_EYE_OUTER][0]) / 2.0)
    rey = int((landmarks[_RIGHT_EYE_INNER][1] + landmarks[_RIGHT_EYE_OUTER][1]) / 2.0)
    nose_y = int(landmarks[_NOSE_TIP][1])

    # Under-eye extends from just below the eye to mid-way to the nose
    ue_bottom = ley + int((nose_y - ley) * 0.6)
    roi_w = 18

    def _mean_L(cx: int, cy: int, rw: int, bottom: int, top_offset: int = 2) -> float:
        """Mean L* in a rectangular under-eye ROI."""
        x1 = max(0, cx - rw)
        x2 = min(w, cx + rw)
        y1 = max(0, cy + top_offset)
        y2 = min(h, bottom)
        if x1 >= x2 or y1 >= y2:
            return 50.0
        patch = L[y1:y2, x1:x2]
        return float(patch.mean())

    # Cheek reference: below and outward from the under-eye region
    def _cheek_L(cx: int, cy: int, rw: int, bottom: int) -> float:
        x1 = max(0, cx + rw + 5)
        x2 = min(w, cx + rw + 25)
        y1 = max(0, cy + 5)
        y2 = min(h, bottom)
        if x1 >= x2 or y1 >= y2:
            return 50.0
        patch = L[y1:y2, x1:x2]
        return float(patch.mean())

    ue_L = []
    cheek_L = []
    for cx, cy in [(lex, ley), (rex, rey)]:
        ue_L.append(_mean_L(cx, cy, roi_w, ue_bottom))
        cheek_L.append(_cheek_L(cx, cy, roi_w, ue_bottom))

    ue_avg = np.mean(ue_L)
    cheek_avg = np.mean(cheek_L)

    # Relative darkness ratio
    darkness_ratio = max(0.0, (cheek_avg - ue_avg) / max(cheek_avg, 1.0))

    severity = _classify_severity(darkness_ratio)
    confidence = _compute_confidence(darkness_ratio)

    return DarkCirclesResult(severity=severity, confidence=round(confidence, 1))


def _classify_severity(ratio: float) -> str:
    for threshold, label in _SEVERITY_THRESHOLDS:
        if ratio <= threshold:
            return label
    return "Severe"


def _compute_confidence(ratio: float) -> float:
    if ratio < 0.04:
        return 100.0
    # Stronger signal → higher confidence
    return min(100.0, ratio * 400.0)
