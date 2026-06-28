"""Semantic face-parsing service.

Runs BiSeNet face segmentation on an aligned face crop, extracts
per-class binary masks, and computes pixel counts, coverage
percentages, and bounding rectangles for each facial region.
"""

from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from loguru import logger

from app.providers.faceparsing_provider import FaceParsingProvider

# BiSeNet CelebAMask-HQ class index → name mapping.
# 19-class output from the pretrained BiSeNet model (yakhyo/face-parsing).
_CLASS_MAP: dict[int, str] = {
    0: "background",
    1: "skin",
    2: "l_brow",
    3: "r_brow",
    4: "l_eye",
    5: "r_eye",
    6: "eye_g",
    7: "l_ear",
    8: "r_ear",
    9: "ear_r",
    10: "nose",
    11: "mouth",
    12: "u_lip",
    13: "l_lip",
    14: "neck",
    15: "neck_l",
    16: "cloth",
    17: "hair",
    18: "hat",
}

# Composite groups built from individual class masks.
_COMPOSITES: dict[str, list[str]] = {
    "eyes": ["l_eye", "r_eye"],
    "eyebrows": ["l_brow", "r_brow"],
    "lips": ["u_lip", "l_lip", "mouth"],
    "ears": ["l_ear", "r_ear"],
}


@dataclass
class ParsedSegment:
    """Metadata for a single semantic segment.

    Attributes:
        pixels: Number of pixels belonging to this class.
        coverage: Percentage of the total image area (0–100).
        bounding_box: ``[x1, y1, x2, y2]`` or ``None`` when no
            pixels are present.
    """

    pixels: int
    coverage: float
    bounding_box: list[float] | None


@dataclass
class ParsingResult:
    """Result produced by :meth:`ParsingService.analyze`.

    Attributes:
        segments: Flat dict mapping every class name to its
            :class:`ParsedSegment`.
        mask: Full 2-D class-index map (excluded from repr).
    """

    segments: dict[str, ParsedSegment]
    mask: np.ndarray = field(repr=False)

    def metadata(self) -> dict:
        """Build the JSON-serialisable parsing response.

        Groups individual classes into the composite structure
        expected by the API (eyes, lips, eyebrows, ears).

        Returns:
            dict matching the ``parsing`` key of the analysis
            response.
        """
        s = self.segments

        def _info(name: str) -> dict:
            seg = s[name]
            return {"pixels": seg.pixels, "coverage": seg.coverage}

        result: dict = {
            "skin": _info("skin"),
            "hair": _info("hair"),
            "nose": _info("nose"),
            "neck": _info("neck"),
            "background": _info("background"),
        }

        for group_name, members in _COMPOSITES.items():
            group: dict = {}
            for m in members:
                group[m.split("_")[0] if "_" in m else m] = _info(m)
            result[group_name] = group

        return result


def _compute_segment(mask: np.ndarray) -> ParsedSegment:
    """Compute pixel count, coverage, and bounding box for a mask.

    Args:
        mask: Binary mask (non-zero = region of interest).

    Returns:
        :class:`ParsedSegment` with the computed values.
    """
    total = mask.size
    pixels = int(np.count_nonzero(mask))
    coverage = round(pixels / total * 100, 1) if total > 0 else 0.0

    coords = np.argwhere(mask)
    if coords.size == 0:
        return ParsedSegment(pixels=0, coverage=0.0, bounding_box=None)

    y1, x1 = coords.min(axis=0).tolist()
    y2, x2 = coords.max(axis=0).tolist()
    bbox: list[float] = [float(x1), float(y1), float(x2), float(y2)]

    return ParsedSegment(pixels=pixels, coverage=coverage, bounding_box=bbox)


class ParsingService:
    """Semantic face-parsing on aligned face crops.

    Framework-agnostic — operates on numpy arrays and returns a
    :class:`ParsingResult` dataclass.
    """

    def __init__(self) -> None:
        self._provider = FaceParsingProvider()

    def analyze(
        self,
        image: np.ndarray,
        affine_matrix: list[list[float]] | np.ndarray | None = None,
    ) -> ParsingResult:
        """Run semantic segmentation and structure the output.

        Two modes:

        * **Aligned-crop mode** (``affine_matrix=None``, default):
          The *image* is assumed to be an already-aligned face crop.
          The model runs directly on it and the resulting mask is in
          the same coordinate space.

        * **Full-image mode** (``affine_matrix`` provided):
          The *image* is the original full-resolution frame.  The
          model runs on the full image first, then the predicted
          mask is warped into aligned-face space (512×512) using the
          affine transform returned by :func:`face_align.estimate_norm`.

        Args:
            image: BGR image --- either an aligned face crop (mode 1)
                or the original full frame (mode 2).
            affine_matrix: 2×3 affine transformation matrix mapping
                from **original** image coordinates to aligned-face
                space.  When given, switches to full-image mode.

        Returns:
            :class:`ParsingResult` with per-class metadata and the
            full segmentation mask (always 512×512 in full-image
            mode).

        Raises:
            ValueError: If the segmentation produces an unexpected
                output shape.
        """
        if affine_matrix is not None:
            mask_full = self._provider.predict(image)
            M = np.array(affine_matrix, dtype=np.float64)
            mask = cv2.warpAffine(
                mask_full,
                M,
                (512, 512),
                flags=cv2.INTER_NEAREST,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=0,
            )
            expected = (512, 512)
        else:
            mask = self._provider.predict(image)
            expected = image.shape[:2]

        if mask.shape[:2] != expected:
            raise ValueError(
                f"Segmentation mask shape {mask.shape} does not match "
                f"expected shape {expected}"
            )

        segments: dict[str, ParsedSegment] = {}

        for class_idx, class_name in _CLASS_MAP.items():
            binary = (mask == class_idx)
            segments[class_name] = _compute_segment(binary)

        total_pixels = mask.shape[0] * mask.shape[1]
        covered = sum(s.pixels for s in segments.values())
        if covered < total_pixels:
            logger.warning(
                "Segmentation coverage {pct:.1f}% — some pixels "
                "were not classified",
                pct=covered / total_pixels * 100,
            )

        logger.info(
            "Face parsing complete — {n} regions, "
            "skin={skin_px}px ({skin_cov:.1f}%)",
            n=len(segments),
            skin_px=segments["skin"].pixels,
            skin_cov=segments["skin"].coverage,
        )

        return ParsingResult(segments=segments, mask=mask)
