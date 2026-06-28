"""Face geometry analysis service.

Orchestrates facial proportion measurement, face-shape classification,
symmetry analysis, and golden-ratio proximity scoring. Pure
deterministic computations — no AI models involved.
"""

from __future__ import annotations

from dataclasses import dataclass

from loguru import logger

from app.analysis.face import proportions as prop
from app.analysis.face import shape as shape_cls
from app.analysis.face import symmetry as sym

PHI = 1.618  # golden ratio


@dataclass
class GeometryResult:
    """Composite result of the full geometry pipeline.

    Attributes:
        measurements: Raw pixel/normalised measurements from
            :func:`app.analysis.face.proportions.all_measurements`.
        shape: Face shape classification result.
        symmetry: Symmetry scores dict.
        golden_ratio: Golden-ratio proximity dict with ``overall``
            score and ``individual`` breakdown.
    """

    measurements: dict[str, float]
    shape: shape_cls.ShapeResult
    symmetry: dict
    golden_ratio: dict


def _phi_score(value: float, ideal: float = PHI) -> float:
    """Return a 0–100 score indicating proximity to the golden ratio.

    A perfect match returns 100. Scores decay quadratically with
    deviation.
    """
    if value <= 0:
        return 0.0
    ratio = value / ideal if value > ideal else ideal / value
    # ratio >= 1; 1 = perfect, 2 = off by 100%
    score = max(0.0, 100.0 * (2.0 - ratio))
    return round(score, 1)


def _compute_golden_ratio(measurements: dict[str, float]) -> dict:
    """Evaluate how closely facial ratios match the golden ratio.

    Returns:
        dict with ``overall`` and ``individual`` keys.
    """
    indiv: dict[str, float] = {
        "face_aspect": _phi_score(measurements["face_aspect_ratio"]),
        "eye_spacing": _phi_score(
            measurements["eye_distance"] / measurements["eye_width"]
            if measurements["eye_width"] > 0 else 0
        ),
        "mouth_nose": _phi_score(
            measurements["mouth_width"] / measurements["nose_width"]
            if measurements["nose_width"] > 0 else 0
        ),
    }

    overall = round(sum(indiv.values()) / len(indiv), 1)
    return {"overall": overall, "individual": indiv}


class GeometryService:
    """Computes face geometry, shape, symmetry, and golden ratio.

    Framework-agnostic — operates on landmark coordinates and
    returns a :class:`GeometryResult` dataclass.
    """

    def analyze(
        self, landmarks: list[list[float]], parsing: dict | None = None
    ) -> GeometryResult:
        """Run the full geometry analysis pipeline.

        Args:
            landmarks: 468 MediaPipe landmark ``[x, y]`` pairs.
            parsing: Parsing metadata (reserved for future use).

        Returns:
            :class:`GeometryResult` with all computed metrics.
        """
        measurements = prop.all_measurements(landmarks)
        logger.info(
            "Proportions computed — face {w}x{h}, "
            "jaw {jaw}, eyes {eyes} apart",
            w=measurements["face_width"],
            h=measurements["face_height"],
            jaw=measurements["jaw_width"],
            eyes=measurements["eye_distance"],
        )

        shape = shape_cls.classify(measurements)
        logger.info("Shape classified as {s}", s=shape.type)

        symmetry = sym.all_scores(landmarks)
        logger.info(
            "Symmetry — overall {s}/100",
            s=symmetry["overall"],
        )

        golden = _compute_golden_ratio(measurements)
        logger.info(
            "Golden ratio — overall {g}/100",
            g=golden["overall"],
        )

        return GeometryResult(
            measurements=measurements,
            shape=shape,
            symmetry=symmetry,
            golden_ratio=golden,
        )
