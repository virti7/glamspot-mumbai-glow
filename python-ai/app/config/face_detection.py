"""Face detection configuration.

Centralises all tunable parameters for the face detection pipeline,
including detection model settings, image preprocessing options, and
fallback strategy ordering.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar


@dataclass
class FaceDetectionConfig:
    """Configuration for face detection and its fallback strategies.

    Parameters control the underlying InsightFace model, optional
    preprocessing steps, and the ordered list of fallback strategies
    to attempt when the primary detection fails.

    Attributes:
        detection_size: (width, height) tuple passed to InsightFace's
            ``prepare(det_size=...)``. Larger values improve recall
            but increase inference time.
        detection_threshold: Confidence threshold for face detection.
            Lower values (e.g. 0.3) increase recall at the cost of
            more false positives. InsightFace default is ~0.5.
        max_faces: Maximum number of faces to return (0 = no limit).
            When >0 and multiple faces are detected, the largest
            ``max_faces`` faces are kept.
        resize_before_detection: If ``True``, images larger than
            ``target_size`` are downscaled before detection to
            improve inference speed with minimal recall loss.
        target_size: Maximum dimension (width or height) when
            ``resize_before_detection`` is enabled.

    Preprocessing flags (all dimension-preserving pixel operations):

        clahe_enabled: Apply Contrast Limited Adaptive Histogram
            Equalisation before detection.
        clahe_clip_limit: CLAHE clip limit (higher = more contrast).
        clahe_grid_size: (rows, cols) for CLAHE tiles.
        gamma_enabled: Apply gamma correction.
        gamma_value: Gamma value (<1 brightens, >1 darkens).
        sharpening_enabled: Apply unsharp-mask-style sharpening.

    Primary / fallback strategies:

        primary_strategy: Name of the first strategy to try.
        fallback_strategies: Ordered list of strategy names to try
            if the current one yields no face. Valid strategy names:
            ``"original"``, ``"clahe"``, ``"gamma"``,
            ``"clahe+gamma"``, ``"sharpening"``, ``"clahe+sharpening"``,
            ``"low_threshold"``, ``"large_det_size"``.
        fallback_enabled: Master switch for fallback logic.
    """

    # Detection model parameters
    detection_size: tuple[int, int] = (640, 640)
    detection_threshold: float = 0.3
    max_faces: int = 1

    # Resize
    resize_before_detection: bool = True
    target_size: int = 640

    # Preprocessing — CLAHE
    clahe_enabled: bool = True
    clahe_clip_limit: float = 2.0
    clahe_grid_size: tuple[int, int] = (8, 8)

    # Preprocessing — gamma correction
    gamma_enabled: bool = True
    gamma_value: float = 1.2

    # Preprocessing — sharpening
    sharpening_enabled: bool = True

    # Fallback strategy list
    primary_strategy: str = "original"
    fallback_strategies: tuple[str, ...] = (
        "original",
        "clahe",
        "clahe+gamma",
        "low_threshold",
        "large_det_size",
    )
    fallback_enabled: bool = True

    # Common presets
    PRESET_ORIGINAL: ClassVar[FaceDetectionConfig] = None  # type: ignore[assignment]
    PRESET_AGGRESSIVE: ClassVar[FaceDetectionConfig] = None  # type: ignore[assignment]
    PRESET_MAX_RECALL: ClassVar[FaceDetectionConfig] = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

FaceDetectionConfig.PRESET_ORIGINAL = FaceDetectionConfig(
    detection_size=(640, 640),
    detection_threshold=0.5,
    max_faces=1,
    resize_before_detection=False,
    clahe_enabled=False,
    gamma_enabled=False,
    sharpening_enabled=False,
    fallback_enabled=False,
    primary_strategy="original",
    fallback_strategies=(),
)

FaceDetectionConfig.PRESET_AGGRESSIVE = FaceDetectionConfig(
    detection_size=(640, 640),
    detection_threshold=0.3,
    max_faces=1,
    resize_before_detection=True,
    target_size=640,
    clahe_enabled=True,
    clahe_clip_limit=2.0,
    clahe_grid_size=(8, 8),
    gamma_enabled=True,
    gamma_value=1.2,
    sharpening_enabled=True,
    fallback_enabled=True,
    primary_strategy="original",
    fallback_strategies=("original", "clahe", "clahe+gamma", "low_threshold", "large_det_size"),
)

FaceDetectionConfig.PRESET_MAX_RECALL = FaceDetectionConfig(
    detection_size=(960, 960),
    detection_threshold=0.2,
    max_faces=1,
    resize_before_detection=False,
    clahe_enabled=True,
    clahe_clip_limit=3.0,
    clahe_grid_size=(8, 8),
    gamma_enabled=True,
    gamma_value=0.8,
    sharpening_enabled=True,
    fallback_enabled=True,
    primary_strategy="original",
    fallback_strategies=(
        "original", "large_det_size", "clahe", "gamma", "clahe+gamma",
        "clahe+large", "low_threshold",
    ),
)
