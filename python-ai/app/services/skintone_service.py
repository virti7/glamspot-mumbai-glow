"""Skin-tone analysis service.

Isolates skin pixels using the BiSeNet face-parsing mask and
delegates colorimetric analysis to the skintone analysis module.
"""

from __future__ import annotations

import numpy as np
from loguru import logger

from app.analysis.skin import skintone

_SKIN_CLASS = 1  # BiSeNet class index for skin


class SkintoneService:
    """Computes skin-tone metrics from an aligned face and its parsing mask.

    Framework-agnostic — operates on numpy arrays and returns a
    :class:`skintone.SkintoneResult` dataclass.
    """

    def analyze(
        self, aligned_image: np.ndarray, parsing_mask: np.ndarray
    ) -> skintone.SkintoneResult:
        """Run skin-tone analysis on skin pixels isolated by the parsing mask.

        Args:
            aligned_image: BGR aligned face crop.
            parsing_mask: 2-D class-index map from BiSeNet (same
                spatial dimensions as *aligned_image*).

        Returns:
            :class:`skintone.SkintoneResult` containing Fitzpatrick,
            MONK, undertone, and colour-space metrics.

        Raises:
            ValueError: If the mask yields no skin pixels.
        """
        skin_mask = parsing_mask == _SKIN_CLASS
        skin_pixels = aligned_image[skin_mask]

        logger.info(
            "Skin pixels extracted — {count} px ({pct:.1f}% of face)",
            count=skin_pixels.shape[0],
            pct=skin_pixels.shape[0] / aligned_image.size * 100,
        )

        result = skintone.analyze(skin_pixels)

        logger.info(
            "Skin tone — Fitzpatrick {fitz}, MONK {monk}, undertone {ut}, "
            "ITA {ita}°, brightness {b}/{s}",
            fitz=result.fitzpatrick,
            monk=result.monk,
            ut=result.undertone,
            ita=result.ita,
            b=result.brightness,
            s=result.saturation,
        )

        return result
