"""Oiliness classification using specular-highlight analysis.

Measures specular reflection density and distribution on the skin
region using the HSV value channel. Deterministic heuristic —
replaceable by a dedicated model.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.analysis.skin.skintone import SkintoneResult

_HIGH_VALUE_THRESH = 200       # V > this → potential specular highlight
_LOW_SAT_THRESH = 40           # S < this → desaturated (oily shine)
_HIGHLIGHT_RATIOS: list[tuple[float, str]] = [
    (0.03, "Dry"),
    (0.10, "Normal"),
    (0.25, "Combination"),
    (float("inf"), "Oily"),
]


@dataclass
class OilinessResult:
    """Oiliness classification result.

    Attributes:
        type: ``Dry``, ``Normal``, ``Combination``, or ``Oily``.
        confidence: Confidence in the classification (0–100).
    """

    type: str
    confidence: float


def analyze(
    aligned_bgr: np.ndarray,
    skin_mask: np.ndarray,
    landmarks: list[list[float]],  # noqa: ARG001
    skintone: SkintoneResult,       # noqa: ARG001
) -> OilinessResult:
    """Classify skin oiliness level from specular reflection analysis.

    Args:
        aligned_bgr: Full aligned BGR face crop.
        skin_mask: Boolean mask of skin pixels.
        landmarks: 468 MediaPipe landmark pixel coordinates (unused).
        skintone: Skin-tone classification (unused).

    Returns:
        :class:`OilinessResult` with oiliness type and confidence.
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean_mask = cv2.erode(skin_mask.astype(np.uint8), kernel, iterations=1)

    hsv = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2HSV)
    V = hsv[:, :, 2].astype(np.float32)
    S = hsv[:, :, 1].astype(np.float32)

    # Specular highlights: high V + low S (shiny, desaturated)
    highlight_mask = (
        (V > _HIGH_VALUE_THRESH) & (S < _LOW_SAT_THRESH)
    ).astype(np.uint8) * 255
    highlight_mask = cv2.bitwise_and(
        highlight_mask, highlight_mask, mask=clean_mask,
    )

    total_skin = int(clean_mask.sum())
    highlight_area = int(np.count_nonzero(highlight_mask))
    highlight_ratio = highlight_area / max(total_skin, 1)

    # Assess patchiness for Combination vs Oily distinction
    # Divide the face into a 3x3 grid and check highlight distribution
    h, w = aligned_bgr.shape[:2]
    grid_rows, grid_cols = 3, 3
    cell_h, cell_w = h // grid_rows, w // grid_cols
    grid_cells_with_highlights = 0
    for gy in range(grid_rows):
        for gx in range(grid_cols):
            y1, y2 = gy * cell_h, (gy + 1) * cell_h
            x1, x2 = gx * cell_w, (gx + 1) * cell_w
            cell = highlight_mask[y1:y2, x1:x2]
            cell_skin = clean_mask[y1:y2, x1:x2]
            cell_skin_px = int(cell_skin.sum())
            if cell_skin_px > 50:  # enough skin in this cell
                cell_hl = int(cell.sum())
                if cell_hl / max(cell_skin_px, 1) > 0.02:
                    grid_cells_with_highlights += 1

    is_patchy = grid_cells_with_highlights < 4 and grid_cells_with_highlights > 0

    # Classify
    oiliness_type = _classify_oiliness(highlight_ratio, is_patchy)
    confidence = _compute_confidence(highlight_ratio, grid_cells_with_highlights)

    return OilinessResult(type=oiliness_type, confidence=round(confidence, 1))


def _classify_oiliness(ratio: float, patchy: bool) -> str:
    for threshold, label in _HIGHLIGHT_RATIOS:
        if ratio <= threshold:
            if label == "Combination" and not patchy:
                return "Oily"
            return label
    return "Oily"


def _compute_confidence(ratio: float, cells: int) -> float:
    if ratio < 0.03:
        return 100.0
    # Consistent signal across many cells → higher confidence
    cell_factor = min(100.0, cells * 12.5)
    intensity_factor = min(100.0, ratio * 300.0)
    return min(100.0, intensity_factor * 0.6 + cell_factor * 0.4)
