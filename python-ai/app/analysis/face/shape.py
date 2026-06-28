"""Deterministic face-shape classification from landmark ratios.

No machine learning is used. The classifier applies a rule-based
decision tree using proportion thresholds derived from classical
facial anthropometry.
"""

from __future__ import annotations

from dataclasses import dataclass

_FACE_ASPECT_LONG = 1.50     # above this → oblong / rectangle
_FACE_ASPECT_ROUND = 1.30    # below this → round / square / heart

_JAW_TO_FACE_NARROW = 0.75   # jaw / face-width below this → tapered
_JAW_TO_FACE_WIDE = 0.90     # jaw / face-width above this → wide jaw
_FOREHEAD_TO_JAW_HEART = 1.20  # forehead / jaw above → heart
_FOREHEAD_TO_JAW_TRIANGLE = 0.85  # forehead / jaw below → triangle


@dataclass
class ShapeResult:
    """Face shape classification result.

    Attributes:
        type: Predicted face shape label.
        confidence: Confidence score (0–100).
        reasoning: Human-readable explanation of the decision.
    """

    type: str
    confidence: float
    reasoning: str


def classify(measurements: dict[str, float]) -> ShapeResult:
    """Classify face shape from computed proportion measurements.

    The classifier considers face aspect ratio, jaw-to-face-width
    ratio, and forehead-to-jaw-width ratio to reach a decision.

    Args:
        measurements: Dict produced by
            :func:`app.analysis.face.proportions.all_measurements`.

    Returns:
        :class:`ShapeResult` with the predicted shape, confidence
        score, and decision rationale.
    """
    far = measurements["face_aspect_ratio"]  # height / width
    jwf = measurements["jaw_width"] / measurements["face_width"] if measurements["face_width"] > 0 else 0
    fwj = measurements["forehead_width"] / measurements["jaw_width"] if measurements["jaw_width"] > 0 else 0

    # ---- Decision tree ----
    if far >= _FACE_ASPECT_LONG:
        # Long face variants
        if jwf >= _JAW_TO_FACE_WIDE:
            result = ShapeResult(
                type="Rectangle",
                confidence=_map_confidence(far, _FACE_ASPECT_LONG, 1.70, 0.85, 0.95),
                reasoning=_reason("Rectangle", far, jwf, fwj),
            )
        else:
            result = ShapeResult(
                type="Oblong",
                confidence=_map_confidence(far, _FACE_ASPECT_LONG, 1.70, 0.65, 0.85),
                reasoning=_reason("Oblong", far, jwf, fwj),
            )
    elif far <= _FACE_ASPECT_ROUND:
        # Short face variants
        if jwf >= _JAW_TO_FACE_WIDE:
            result = ShapeResult(
                type="Square",
                confidence=_map_confidence(jwf, _JAW_TO_FACE_WIDE, 1.0, 0.75, 0.95),
                reasoning=_reason("Square", far, jwf, fwj),
            )
        elif fwj >= _FOREHEAD_TO_JAW_HEART:
            result = ShapeResult(
                type="Heart",
                confidence=_map_confidence(fwj, _FOREHEAD_TO_JAW_HEART, 1.4, 0.75, 0.95),
                reasoning=_reason("Heart", far, jwf, fwj),
            )
        else:
            result = ShapeResult(
                type="Round",
                confidence=_map_confidence(far, 1.0, _FACE_ASPECT_ROUND, 0.85, 0.95),
                reasoning=_reason("Round", far, jwf, fwj),
            )
    else:
        # Medium aspect ratio — oval or diamond / triangle
        if fwj >= _FOREHEAD_TO_JAW_HEART:
            result = ShapeResult(
                type="Heart",
                confidence=_map_confidence(fwj, _FOREHEAD_TO_JAW_HEART, 1.4, 0.75, 0.95),
                reasoning=_reason("Heart", far, jwf, fwj),
            )
        elif fwj <= _FOREHEAD_TO_JAW_TRIANGLE:
            result = ShapeResult(
                type="Triangle",
                confidence=_map_confidence(fwj, 0.6, _FOREHEAD_TO_JAW_TRIANGLE, 0.85, 0.95),
                reasoning=_reason("Triangle", far, jwf, fwj),
            )
        elif jwf <= _JAW_TO_FACE_NARROW and fwj < 1.1:
            # Narrow jaw with comparable forehead → diamond-like
            # (cheekbones should be the widest)
            result = ShapeResult(
                type="Diamond",
                confidence=_map_confidence(jwf, 0.6, _JAW_TO_FACE_NARROW, 0.80, 0.95),
                reasoning=_reason("Diamond", far, jwf, fwj),
            )
        else:
            result = ShapeResult(
                type="Oval",
                confidence=(
                    _map_confidence(far, _FACE_ASPECT_ROUND, _FACE_ASPECT_LONG, 0.85, 0.95) * 0.5
                    + _map_confidence(jwf, 0.7, _JAW_TO_FACE_NARROW, 0.85, 0.95) * 0.3
                    + _map_confidence(fwj, 0.95, 1.15, 0.85, 0.95) * 0.2
                ),
                reasoning=_reason("Oval", far, jwf, fwj),
            )

    return result


def _map_confidence(
    value: float, lo: float, hi: float, conf_lo: float = 0.75, conf_hi: float = 0.95
) -> float:
    """Linearly map a value within [lo, hi] to a confidence in [conf_lo, conf_hi].

    Values outside the range saturate at the nearest bound.
    """
    if value <= lo:
        return conf_lo * 100.0
    if value >= hi:
        return conf_hi * 100.0
    ratio = (value - lo) / (hi - lo)
    return (conf_lo + ratio * (conf_hi - conf_lo)) * 100.0


def _reason(shape: str, far: float, jwf: float, fwj: float) -> str:
    """Build a readable rationale for the classification."""
    parts = {
        "face_aspect_ratio": f"face ratio {far:.2f}",
        "jaw_width_ratio": f"jaw/face {jwf:.2f}",
        "forehead_jaw_ratio": f"forehead/jaw {fwj:.2f}",
    }
    return f"{shape} — {', '.join(parts.values())}"
