"""Skin analysis service — orchestrates all skin condition analyzers.

Isolates the skin region from the parsing mask and delegates to
each independent analyzer module (acne, wrinkles, pigmentation,
dark circles, redness, pores, oiliness).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from loguru import logger

from app.analysis.skin import acne, wrinkles, pigmentation, dark_circles
from app.analysis.skin import redness, pores, oiliness
from app.analysis.skin.skintone import SkintoneResult

_SKIN_CLASS = 1

# Severity → health-score mapping (100 = perfect)
_SEVERITY_HEALTH: dict[str, float] = {
    "None": 100.0,
    "Low": 80.0,
    "Mild": 70.0,
    "Medium": 60.0,
    "Moderate": 40.0,
    "High": 20.0,
    "Severe": 10.0,
}
_OILINESS_HEALTH: dict[str, float] = {
    "Dry": 60.0,
    "Normal": 100.0,
    "Combination": 70.0,
    "Oily": 50.0,
}


@dataclass
class SkinAnalysisResult:
    """Aggregated skin analysis result.

    Attributes:
        overall_skin_health: Composite health score (0–100).
        acne: :class:`acne.AcneResult`.
        wrinkles: :class:`wrinkles.WrinklesResult`.
        pigmentation: :class:`pigmentation.PigmentationResult`.
        dark_circles: :class:`dark_circles.DarkCirclesResult`.
        redness: :class:`redness.RednessResult`.
        pores: :class:`pores.PoresResult`.
        oiliness: :class:`oiliness.OilinessResult`.
    """

    overall_skin_health: float
    acne: acne.AcneResult
    wrinkles: wrinkles.WrinklesResult
    pigmentation: pigmentation.PigmentationResult
    dark_circles: dark_circles.DarkCirclesResult
    redness: redness.RednessResult
    pores: pores.PoresResult
    oiliness: oiliness.OilinessResult


class SkinService:
    """Orchestrates skin condition analysis.

    Framework-agnostic — operates on numpy arrays and returns a
    :class:`SkinAnalysisResult` dataclass.
    """

    def analyze(
        self,
        aligned_image: np.ndarray,
        parsing_mask: np.ndarray,
        landmarks: list[list[float]],
        skintone_result: SkintoneResult,
    ) -> SkinAnalysisResult:
        """Run all skin condition analyzers and aggregate results.

        Args:
            aligned_image: BGR aligned face crop.
            parsing_mask: 2-D class-index map from BiSeNet.
            landmarks: 468 MediaPipe landmark pixel coordinates.
            skintone_result: Skin-tone classification from
                :class:`SkintoneService`.

        Returns:
            :class:`SkinAnalysisResult` with all condition metrics
            and a composite health score.
        """
        skin_mask = parsing_mask == _SKIN_CLASS

        logger.info(
            "Skin analysis running on {n} skin pixels",
            n=int(skin_mask.sum()),
        )

        acne_result = acne.analyze(aligned_image, skin_mask, landmarks, skintone_result)
        wrinkles_result = wrinkles.analyze(aligned_image, skin_mask, landmarks, skintone_result)
        pigmentation_result = pigmentation.analyze(
            aligned_image, skin_mask, landmarks, skintone_result,
        )
        dark_circles_result = dark_circles.analyze(
            aligned_image, skin_mask, landmarks, skintone_result,
        )
        redness_result = redness.analyze(aligned_image, skin_mask, landmarks, skintone_result)
        pores_result = pores.analyze(aligned_image, skin_mask, landmarks, skintone_result)
        oiliness_result = oiliness.analyze(aligned_image, skin_mask, landmarks, skintone_result)

        overall = self._compute_health_score(
            acne_result, wrinkles_result, pigmentation_result,
            dark_circles_result, redness_result, pores_result,
            oiliness_result,
        )

        logger.info(
            "Skin analysis complete — health={health}, "
            "acne={acne}, wrinkles={wr}, pigmentation={pig}, "
            "dark_circles={dc}, redness={red}, pores={por}, "
            "oiliness={oil}",
            health=round(overall, 1),
            acne=acne_result.severity,
            wr=wrinkles_result.severity,
            pig=pigmentation_result.severity,
            dc=dark_circles_result.severity,
            red=redness_result.severity,
            por=pores_result.visibility,
            oil=oiliness_result.type,
        )

        return SkinAnalysisResult(
            overall_skin_health=round(overall, 1),
            acne=acne_result,
            wrinkles=wrinkles_result,
            pigmentation=pigmentation_result,
            dark_circles=dark_circles_result,
            redness=redness_result,
            pores=pores_result,
            oiliness=oiliness_result,
        )

    @staticmethod
    def _compute_health_score(
        acne_result: acne.AcneResult,
        wrinkles_result: wrinkles.WrinklesResult,
        pigmentation_result: pigmentation.PigmentationResult,
        dark_circles_result: dark_circles.DarkCirclesResult,
        redness_result: redness.RednessResult,
        pores_result: pores.PoresResult,
        oiliness_result: oiliness.OilinessResult,
    ) -> float:
        """Blend individual condition scores into a single health metric."""
        scores: list[float] = [
            _SEVERITY_HEALTH.get(acne_result.severity, 50.0),
            _SEVERITY_HEALTH.get(wrinkles_result.severity, 50.0),
            _SEVERITY_HEALTH.get(pigmentation_result.severity, 50.0),
            _SEVERITY_HEALTH.get(dark_circles_result.severity, 50.0),
            _SEVERITY_HEALTH.get(redness_result.severity, 50.0),
            _SEVERITY_HEALTH.get(pores_result.visibility, 50.0),
            _OILINESS_HEALTH.get(oiliness_result.type, 50.0),
        ]
        return float(np.mean(scores))
