"""Deterministic skin-tone analysis using colorimetry.

All classification is rule-based using CIE L*a*b*, HSV, and RGB
colour-space statistics. No machine learning is used.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# ITA thresholds for Fitzpatrick skin type
# ---------------------------------------------------------------------------
# ITA° = arctan((L* - 50) / b*) × 180 / π
_FITZPATRICK_BY_ITA: list[tuple[float, str, str]] = [
    (55.0, "I", "Very light — always burns"),
    (41.0, "II", "Light — usually burns"),
    (28.0, "III", "Light intermediate — sometimes burns"),
    (10.0, "IV", "Tan — rarely burns"),
    (-30.0, "V", "Brown — very rarely burns"),
    (float("-inf"), "VI", "Dark — never burns"),
]

# Approximate MONK Skin Tone (1–10) from ITA
_MONK_BY_ITA: list[tuple[float, int]] = [
    (62.0, 1),
    (55.0, 2),
    (48.0, 3),
    (41.0, 4),
    (34.0, 5),
    (28.0, 6),
    (19.0, 7),
    (10.0, 8),
    (-10.0, 9),
    (float("-inf"), 10),
]

# LAB thresholds for undertone classification
_WARM_B_THRESH = 14.0
_WARM_A_THRESH = 8.0
_COOL_B_THRESH = 8.0
_COOL_A_THRESH = 5.0

# Olive detection – higher a*/b* ratio relative to neutral skin
_OLIVE_RATIO_THRESH = 0.65


@dataclass
class SkintoneResult:
    """Result of skin-tone analysis.

    Attributes:
        fitzpatrick: Fitzpatrick skin type (I–VI).
        fitzpatrick_description: Short description of the type.
        monk: Approximate MONK skin-tone index (1–10).
        undertone: Predicted undertone (Warm, Cool, Neutral, Olive).
        confidence: Overall confidence of the classification (0–100).
        ita: Individual Typology Angle in degrees.
        average_rgb: Mean R, G, B values (0–255).
        average_hsv: Mean H, S, V values (H 0–180, S/V 0–255).
        average_lab: Mean L*, a*, b* values.
        average_ycbcr: Mean Y, Cb, Cr values.
        brightness: Perceived brightness (L* from LAB, 0–100).
        saturation: Colour saturation (Chroma from LAB).
    """

    fitzpatrick: str
    fitzpatrick_description: str
    monk: int
    undertone: str
    confidence: float
    ita: float
    average_rgb: list[float]
    average_hsv: list[float]
    average_lab: list[float]
    average_ycbcr: list[float]
    brightness: float
    saturation: float


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _mean_std(pixels: np.ndarray, conversion: int | None = None) -> np.ndarray:
    """Convert pixels to a target colour space and return the channel means.

    Args:
        pixels: N×3 array of BGR pixels (uint8).
        conversion: ``cv2.COLOR_*`` code, or ``None`` to keep BGR.

    Returns:
        1-D array of mean channel values (float).
    """
    if conversion is not None:
        converted = cv2.cvtColor(pixels.reshape(1, -1, 3), conversion)
        return converted.reshape(-1, 3).mean(axis=0)
    return pixels.mean(axis=0)


def compute_ita(lab: np.ndarray) -> float:
    """Individual Typology Angle in degrees.

    Args:
        lab: ``[L*, a*, b*]`` mean values.

    Returns:
        ITA in degrees.
    """
    L_star, _, b_star = lab
    return float(np.arctan2(L_star - 50.0, b_star) * 180.0 / np.pi)


# ---------------------------------------------------------------------------
# Classifiers
# ---------------------------------------------------------------------------


def _fitzpatrick_from_ita(ita: float) -> tuple[str, str]:
    for threshold, label, desc in _FITZPATRICK_BY_ITA:
        if ita > threshold:
            return label, desc
    return "VI", "Dark — never burns"


def _monk_from_ita(ita: float) -> int:
    for threshold, index in _MONK_BY_ITA:
        if ita > threshold:
            return index
    return 10


def _classify_undertone(lab: np.ndarray) -> tuple[str, float]:
    """Determine undertone from LAB colour statistics.

    Returns:
        Tuple of ``(label, confidence)`` where label is one of
        Warm, Cool, Neutral, or Olive.
    """
    _, a_star, b_star = lab
    ratio = abs(a_star) / (abs(b_star) + 1e-8)

    # Olive: moderate b* with relatively high a*/b* ratio
    if (_WARM_B_THRESH * 0.7 <= b_star <= _WARM_B_THRESH * 1.1
            and ratio > _OLIVE_RATIO_THRESH):
        conf = _scale_confidence(ratio, _OLIVE_RATIO_THRESH, 1.0)
        return ("Olive", round(conf, 1))

    # Warm
    if b_star >= _WARM_B_THRESH and a_star >= _WARM_A_THRESH:
        conf = _scale_confidence(b_star, _WARM_B_THRESH, 22.0)
        return ("Warm", round(conf, 1))

    # Cool
    if b_star <= _COOL_B_THRESH and a_star <= _COOL_A_THRESH:
        conf = _scale_confidence(-b_star, -_COOL_B_THRESH + 10, 20.0)
        return ("Cool", round(conf, 1))

    # Neutral – fallback when neither warm nor cool dominates
    dist_warm = max(0.0, b_star - _WARM_B_THRESH)
    dist_cool = max(0.0, _COOL_B_THRESH - b_star)
    neutrality = 1.0 - min(dist_warm, dist_cool) / 10.0
    conf = round(max(0.0, neutrality * 100.0), 1)
    return ("Neutral", conf)


def _scale_confidence(value: float, lo: float, hi: float) -> float:
    """Linearly map a value within [lo, hi] to 0–100 confidence."""
    if value <= lo:
        return 0.0
    if value >= hi:
        return 100.0
    return (value - lo) / (hi - lo) * 100.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze(skin_bgr: np.ndarray) -> SkintoneResult:
    """Run full skin-tone analysis on an array of BGR skin pixels.

    Args:
        skin_bgr: N×3 uint8 array of BGR pixel values belonging
            exclusively to skin regions (non-hair, non-eye, etc.).

    Returns:
        :class:`SkintoneResult` with Fitzpatrick, MONK, undertone,
        colour-space averages, and confidence scores.
    """
    if skin_bgr.size == 0:
        raise ValueError("No skin pixels provided for tone analysis")

    # Colour-space averages
    avg_bgr = _mean_std(skin_bgr, None)                     # B, G, R
    avg_rgb = avg_bgr[2], avg_bgr[1], avg_bgr[0]             # reorder
    avg_hsv = _mean_std(skin_bgr, cv2.COLOR_BGR2HSV)
    avg_lab = _mean_std(skin_bgr, cv2.COLOR_BGR2LAB)
    avg_ycbcr = _mean_std(skin_bgr, cv2.COLOR_BGR2YCrCb)

    # ITA
    ita = compute_ita(avg_lab)

    # Fitzpatrick
    fitzpatrick, fitz_desc = _fitzpatrick_from_ita(ita)

    # MONK
    monk = _monk_from_ita(ita)

    # Undertone
    undertone, undertone_conf = _classify_undertone(avg_lab)

    # Brightness (L*)
    brightness = round(float(avg_lab[0]), 1)

    # Saturation (Chroma = sqrt(a*² + b*²))
    chroma = float(np.sqrt(avg_lab[1] ** 2 + avg_lab[2] ** 2))
    saturation = round(chroma, 1)

    # Overall confidence – blend ITA proximity and undertone confidence
    # ITA confidence: how solidly within a Fitzpatrick range
    ita_conf = _ita_confidence(ita)
    overall = round((ita_conf * 0.5 + undertone_conf * 0.5), 1)

    return SkintoneResult(
        fitzpatrick=fitzpatrick,
        fitzpatrick_description=fitz_desc,
        monk=monk,
        undertone=undertone,
        confidence=overall,
        ita=round(ita, 1),
        average_rgb=[round(v, 1) for v in avg_rgb],
        average_hsv=[round(v, 1) for v in avg_hsv],
        average_lab=[round(v, 1) for v in avg_lab],
        average_ycbcr=[round(v, 1) for v in avg_ycbcr],
        brightness=brightness,
        saturation=saturation,
    )


def _ita_confidence(ita: float) -> float:
    """Confidence that the ITA falls solidly within a Fitzpatrick zone.

    Peaks at the centre of each zone (max 100) and decays toward
    the boundaries.
    """
    zones = [62.0, 48.0, 34.5, 19.0, -10.0, -50.0]
    for centre in zones:
        dist = abs(ita - centre)
        if dist < 10.0:
            return max(0.0, 100.0 - dist * 5.0)
    return 50.0
