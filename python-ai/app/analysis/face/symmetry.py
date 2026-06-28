"""Facial symmetry analysis from MediaPipe landmarks.

Computes left-vs-right symmetry scores for the jaw, eyes, eyebrows,
nose, and mouth, then produces an overall facial symmetry percentage.
All scores are 0–100 where 100 is perfectly symmetric.
"""

from __future__ import annotations

from math import dist

# Pairs of symmetric landmark indices (left, right)
_EYE_CORNERS = [(33, 263), (133, 362)]
_EYEBROW_PEAKS = [(105, 334), (66, 296)]
_JAW_POINTS = [(58, 288), (172, 397), (38, 282)]
_MOUTH_CORNERS = [(61, 291)]
_NOSE_POINTS = [(49, 279), (2, 2)]

# Mid-line anchors used to determine the vertical facial axis
_NASION = 168
_CHIN = 152


def _midline_axis(pts: list[list[float]]) -> tuple[float, float, float, float]:
    """Return the facial midline as ``(x1, y1, x2, y2)``."""
    return (
        pts[_NASION][0],
        pts[_NASION][1],
        pts[_CHIN][0],
        pts[_CHIN][1],
    )


def _reflect_x(
    pt: list[float], mid_x: float, mid_y: float, axis_dx: float, axis_dy: float
) -> list[float]:
    """Reflect a point across the facial midline (approximate)."""
    dx = pt[0] - mid_x
    dy = pt[1] - mid_y
    proj = (dx * axis_dx + dy * axis_dy) / (axis_dx * axis_dx + axis_dy * axis_dy + 1e-8)
    perp_x = dx - proj * axis_dx
    perp_y = dy - proj * axis_dy
    return [pt[0] - 2 * perp_x, pt[1] - 2 * perp_y]


def _pair_score(
    pts: list[list[float]],
    pairs: list[tuple[int, int]],
    mid_x: float,
    mid_y: float,
    axis_dx: float,
    axis_dy: float,
) -> float:
    """Average symmetry score across a list of landmark pairs.

    For each pair, the left point is reflected across the midline
    and compared to the actual right point. A ratio of 1.0 means
    perfect symmetry.
    """
    scores: list[float] = []
    for left_idx, right_idx in pairs:
        left = pts[left_idx]
        right = pts[right_idx]
        reflected = _reflect_x(left, mid_x, mid_y, axis_dx, axis_dy)
        actual_dist = dist(left, right)
        ref_dist = dist(reflected, right)
        # Penalis e when the reflected-vs-actual distance is large
        # relative to the left-vs-right distance
        if actual_dist < 1.0:
            scores.append(100.0)
        else:
            ratio = max(0.0, 1.0 - ref_dist / actual_dist)
            scores.append(ratio * 100.0)
    return sum(scores) / len(scores) if scores else 100.0


def overall_symmetry(pts: list[list[float]]) -> float:
    """Compute a single overall facial symmetry score (0–100).

    Averages sub-scores for jaw, eyes, eyebrows, nose, and mouth.

    Args:
        pts: 468 MediaPipe landmarks as ``[x, y]`` pixel coordinates.

    Returns:
        Symmetry percentage (100 = perfectly symmetric).
    """
    mx, my, nx, ny = _midline_axis(pts)
    ax_dx = nx - mx
    ax_dy = ny - my

    jaw = _pair_score(pts, _JAW_POINTS, mx, my, ax_dx, ax_dy)
    eyes = _pair_score(pts, _EYE_CORNERS, mx, my, ax_dx, ax_dy)
    brows = _pair_score(pts, _EYEBROW_PEAKS, mx, my, ax_dx, ax_dy)
    mouth = _pair_score(pts, _MOUTH_CORNERS, mx, my, ax_dx, ax_dy)
    nose = _pair_score(pts, _NOSE_POINTS, mx, my, ax_dx, ax_dy)

    return round((jaw + eyes + brows + mouth + nose) / 5.0, 1)


def all_scores(pts: list[list[float]]) -> dict:
    """Return a breakdown of symmetry scores.

    Args:
        pts: 468 MediaPipe landmarks.

    Returns:
        dict with keys ``overall``, ``jaw``, ``eyes``, ``eyebrows``,
        ``mouth``, ``nose`` (each 0–100).
    """
    mx, my, nx, ny = _midline_axis(pts)
    ax_dx = nx - mx
    ax_dy = ny - my

    return {
        "overall": overall_symmetry(pts),
        "jaw": round(_pair_score(pts, _JAW_POINTS, mx, my, ax_dx, ax_dy), 1),
        "eyes": round(_pair_score(pts, _EYE_CORNERS, mx, my, ax_dx, ax_dy), 1),
        "eyebrows": round(_pair_score(pts, _EYEBROW_PEAKS, mx, my, ax_dx, ax_dy), 1),
        "mouth": round(_pair_score(pts, _MOUTH_CORNERS, mx, my, ax_dx, ax_dy), 1),
        "nose": round(_pair_score(pts, _NOSE_POINTS, mx, my, ax_dx, ax_dy), 1),
    }
