"""Wrinkle estimation using edge-density analysis on facial regions.

Evaluates forehead, crow's feet, under-eye, and smile-line regions
via Sobel edge magnitude and Hough line detection. Deterministic
heuristic — replaceable by a dedicated model.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

# MediaPipe landmark indices used for ROI definition
_LEFT_EYE_OUTER = 133
_RIGHT_EYE_OUTER = 362
_LEFT_EYE_INNER = 33
_RIGHT_EYE_INNER = 263
_NOSE_TIP = 1
_MOUTH_LEFT = 61
_MOUTH_RIGHT = 291
_CHIN = 152

_SEVERITY_LABELS = ["None", "Mild", "Moderate", "Severe"]


@dataclass
class WrinklesResult:
    """Wrinkle analysis across facial regions.

    Attributes:
        severity: Overall wrinkle severity (``None``, ``Mild``,
            ``Moderate``, ``Severe``).
        forehead: Forehead wrinkle severity.
        crow_feet: Crow's feet severity.
        under_eye: Under-eye wrinkle severity.
        smile_lines: Smile line (nasolabial fold) severity.
        confidence: Confidence in the overall assessment (0–100).
    """

    severity: str
    forehead: str
    crow_feet: str
    under_eye: str
    smile_lines: str
    confidence: float


def _roi_crop(
    image: np.ndarray, x1: int, y1: int, x2: int, y2: int,
) -> np.ndarray:
    """Clip an ROI safely within image bounds."""
    h, w = image.shape[:2]
    x1, x2 = max(0, x1), min(w, x2)
    y1, y2 = max(0, y1), min(h, y2)
    if x1 >= x2 or y1 >= y2:
        return np.zeros((1, 1), dtype=np.uint8)
    return image[y1:y2, x1:x2]


def _wrinkle_score(gray_roi: np.ndarray) -> float:
    """Compute a wrinkle score (0–100) for a grayscale ROI.

    Uses Sobel magnitude as a proxy for wrinkle density.
    """
    if gray_roi.size < 100:
        return 0.0
    blurred = cv2.GaussianBlur(gray_roi, (5, 5), 0)
    sobel_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(sobel_x ** 2 + sobel_y ** 2)
    mean_edge = magnitude.mean()
    # Normalize: typical wrinkle-free face has mean_edge ~2-4,
    # wrinkled regions can reach 15-25
    score = min(100.0, mean_edge * 6.0)
    return score


def _score_to_severity(score: float) -> str:
    if score < 15:
        return "None"
    if score < 35:
        return "Mild"
    if score < 60:
        return "Moderate"
    return "Severe"


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,  # noqa: ARG001
    landmarks: list[list[float]],
    skintone: SkintoneResult,  # noqa: ARG001
) -> WrinklesResult:
    """Estimate wrinkle severity across four facial regions.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean skin mask (unused — ROIs are defined by
            landmarks).
        landmarks: 468 MediaPipe landmark pixel coordinates.
        skintone: Skin-tone classification result (unused in the
            heuristic).

    Returns:
        :class:`WrinklesResult` with per-region severity.
    """
    h, w = aligned_bgr.shape[:2]
    gray = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2GRAY)

    # -- Forehead: upper portion of the face --------------------------------
    # From top of face to ~35 % height, avoid hairline edge
    f_gray = _roi_crop(gray, int(0.15 * w), int(0.03 * h),
                       int(0.85 * w), int(0.32 * h))
    f_score = _wrinkle_score(f_gray)

    # -- Crow's feet: small ROIs around outer eye corners -------------------
    lx, ly = int(landmarks[_LEFT_EYE_OUTER][0]), int(landmarks[_LEFT_EYE_OUTER][1])
    r = 14  # radius
    l_cf = _roi_crop(gray, lx - r, ly - r, lx + r, ly + r)
    rx, ry = int(landmarks[_RIGHT_EYE_OUTER][0]), int(landmarks[_RIGHT_EYE_OUTER][1])
    r_cf = _roi_crop(gray, rx - r, ry - r, rx + r, ry + r)
    cf_score = max(_wrinkle_score(l_cf), _wrinkle_score(r_cf))

    # -- Under-eye: regions below each eye ----------------------------------
    # Left eye centre
    lex = (landmarks[_LEFT_EYE_INNER][0] + landmarks[_LEFT_EYE_OUTER][0]) / 2.0
    ley = (landmarks[_LEFT_EYE_INNER][1] + landmarks[_LEFT_EYE_OUTER][1]) / 2.0
    # Right eye centre
    rex = (landmarks[_RIGHT_EYE_INNER][0] + landmarks[_RIGHT_EYE_OUTER][0]) / 2.0
    rey = (landmarks[_RIGHT_EYE_INNER][1] + landmarks[_RIGHT_EYE_OUTER][1]) / 2.0
    ue_h = int((landmarks[_NOSE_TIP][1] - ley) * 0.5)  # half distance eye→nose
    l_ue = _roi_crop(gray, int(lex - 20), int(ley) + 2, int(lex + 20),
                     int(ley) + ue_h)
    r_ue = _roi_crop(gray, int(rex - 20), int(rey) + 2, int(rex + 20),
                     int(rey) + ue_h)
    ue_score = max(_wrinkle_score(l_ue), _wrinkle_score(r_ue))

    # -- Smile lines: nasolabial fold area -----------------------------------
    # Vertical strip from nose-wing level to mouth-corner level
    nose_y = int(landmarks[_NOSE_TIP][1])
    mouth_y = int((landmarks[_MOUTH_LEFT][1] + landmarks[_MOUTH_RIGHT][1]) / 2.0)
    # Left side
    mlx = int(landmarks[_MOUTH_LEFT][0])
    nl_x = int(landmarks[_NOSE_TIP][0] - 10)
    l_smile = _roi_crop(gray, nl_x, nose_y, mlx + 5, mouth_y + 5)
    # Right side
    mrx = int(landmarks[_MOUTH_RIGHT][0])
    nr_x = int(landmarks[_NOSE_TIP][0] + 10)
    r_smile = _roi_crop(gray, nr_x, nose_y, mrx + 5, mouth_y + 5)
    smile_score = max(_wrinkle_score(l_smile), _wrinkle_score(r_smile))

    # -- Aggregate ----------------------------------------------------------
    scores = {
        "forehead": f_score,
        "crow_feet": cf_score,
        "under_eye": ue_score,
        "smile_lines": smile_score,
    }
    overall = sum(scores.values()) / len(scores)
    # Confidence: higher when scores are consistent (low std)
    std = np.std(list(scores.values()))
    confidence = max(0.0, min(100.0, 100.0 - std * 1.5))

    return WrinklesResult(
        severity=_score_to_severity(overall),
        forehead=_score_to_severity(f_score),
        crow_feet=_score_to_severity(cf_score),
        under_eye=_score_to_severity(ue_score),
        smile_lines=_score_to_severity(smile_score),
        confidence=round(confidence, 1),
    )
