"""Face detection and alignment service.

Detects faces using InsightFace, selects the largest face when
multiple are found (instead of failing), applies configurable
preprocessing strategies, and returns structured metadata together
with an aligned face crop.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
from loguru import logger

from app.config.face_detection import FaceDetectionConfig
from app.providers.insightface_provider import InsightFaceProvider
from app.utils.preprocessing import build_strategies
from insightface.utils import face_align


@dataclass
class FaceResult:
    """Result produced by :meth:`FaceService.analyze`.

    Attributes:
        detected: Whether a face was found.
        confidence: Detection confidence score.
        bounding_box: ``[x1, y1, x2, y2]`` in pixel coordinates.
        center: ``[cx, cy]`` — centre of the bounding box.
        size: ``{"width": int, "height": int}`` of the bounding box.
        face_area: Bounding-box area in square pixels.
        yaw: Estimated yaw angle in degrees (``None`` if unavailable).
        pitch: Estimated pitch angle in degrees (``None`` if unavailable).
        roll: Estimated roll angle in degrees (``None`` if unavailable).
        landmarks_detected: Number of facial landmarks (``None`` if
            the model did not produce them).
        aligned_image: Normalised face crop (BGR) ready for downstream
            analysis stages. Not included in API responses.
        detection_strategy: Name of the strategy that produced this
            detection (``"original"``, ``"clahe"``, etc.).
        total_faces_detected: Number of faces the model found before
            selecting the largest.
    """

    detected: bool
    confidence: float
    bounding_box: list[float]
    center: list[float]
    size: dict
    face_area: float
    yaw: float | None
    pitch: float | None
    roll: float | None
    landmarks_detected: int | None
    aligned_image: np.ndarray | None = field(repr=False)
    detection_strategy: str = ""
    total_faces_detected: int = 0
    alignment_keypoints: list[list[float]] | None = None
    affine_matrix: list[list[float]] | None = None

    def metadata(self) -> dict:
        """Return JSON-serialisable face metadata (excludes the image).

        Returns:
            dict suitable for API response bodies.
        """
        return {
            "detected": self.detected,
            "confidence": round(self.confidence, 3),
            "bounding_box": self.bounding_box,
            "center": [round(c, 1) for c in self.center],
            "size": self.size,
            "face_area": int(self.face_area),
            "yaw": round(self.yaw, 1) if self.yaw is not None else None,
            "pitch": round(self.pitch, 1) if self.pitch is not None else None,
            "roll": round(self.roll, 1) if self.roll is not None else None,
            "landmarks_detected": self.landmarks_detected,
            "aligned": self.aligned_image is not None,
        }


class FaceService:
    """Detects, validates and aligns a single face per image.

    Supports configurable preprocessing, threshold, and detection
    size.  When multiple faces are detected the largest one is
    automatically selected.
    """

    def __init__(self, config: FaceDetectionConfig | None = None) -> None:
        self._config = config or FaceDetectionConfig()
        self._provider = InsightFaceProvider()
        self._provider.configure(
            det_size=self._config.detection_size,
            det_thresh=self._config.detection_threshold,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, image: np.ndarray) -> FaceResult:
        """Detect the largest face, applying configurable fallbacks.

        The image is optionally preprocessed (CLAHE, gamma,
        sharpening) according to the configuration's strategy list.
        Each strategy is tried in order until a face is found.

        Args:
            image: BGR image as a numpy array.

        Returns:
            :class:`FaceResult` containing metadata and the aligned
            face crop.

        Raises:
            ValueError: If **all** strategies fail to detect a face.
        """
        strategies = build_strategies(image, self._config)

        for preprocessed, strategy_name in strategies:
            result = self._analyze_single(preprocessed, strategy_name)
            if result is not None:
                # If the image was preprocessed, the bbox / keypoints
                # from the preprocessed image apply to the preprocessed
                # dimensions.  But since all our preprocessing is
                # dimension-preserving, the coordinates are valid for
                # the original image too.
                return result

        raise ValueError("No face detected in the image")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_result(self, image: np.ndarray, face: Any, strategy: str) -> FaceResult:
        """Construct a :class:`FaceResult` from a detection."""
        x1, y1, x2, y2 = face.bbox.tolist()
        width = x2 - x1
        height = y2 - y1
        centre_x = (x1 + x2) / 2.0
        centre_y = (y1 + y2) / 2.0

        pose = getattr(face, "pose", None)
        pitch = float(pose[0]) if pose is not None and len(pose) > 0 else None
        yaw = float(pose[1]) if pose is not None and len(pose) > 1 else None
        roll = float(pose[2]) if pose is not None and len(pose) > 2 else None

        landmarks = getattr(face, "landmark", None)
        landmarks_count: int | None = len(landmarks) if landmarks is not None else None

        kps = getattr(face, "kps", None)
        kps_list: list[list[float]] | None = kps.tolist() if kps is not None else None

        affine_matrix: list[list[float]] | None = None
        if kps is not None:
            M = face_align.estimate_norm(kps, image_size=512)
            affine_matrix = M.tolist()

        aligned = self._provider.get_aligned_face(image, face)

        return FaceResult(
            detected=True,
            confidence=float(face.det_score),
            bounding_box=[x1, y1, x2, y2],
            center=[centre_x, centre_y],
            size={"width": int(width), "height": int(height)},
            face_area=width * height,
            yaw=yaw,
            pitch=pitch,
            roll=roll,
            landmarks_detected=landmarks_count,
            aligned_image=aligned,
            detection_strategy=strategy,
            alignment_keypoints=kps_list,
            affine_matrix=affine_matrix,
        )

    def _analyze_single(
        self,
        image: np.ndarray,
        strategy: str,
    ) -> FaceResult | None:
        """Run the detector once and return a result if a face is found.

        Also handles configuration changes required by some
        strategies (e.g. larger ``det_size`` or lower threshold).
        """
        # Apply strategy-specific overrides to the provider
        if strategy == "low_threshold":
            self._provider.configure(det_thresh=0.15)
        elif strategy in ("large_det_size", "clahe+large"):
            self._provider.configure(det_size=(960, 960))
        else:
            self._provider.configure(
                det_size=self._config.detection_size,
                det_thresh=self._config.detection_threshold,
            )

        faces = self._provider.detect(image)

        if not faces:
            logger.debug("Face not found — strategy={}", strategy)
            return None

        total = len(faces)

        # When multiple faces are found, select the largest one
        largest = max(
            faces,
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        )

        size = largest.bbox.tolist()
        face_w = size[2] - size[0]
        face_h = size[3] - size[1]
        img_h, img_w = image.shape[:2]

        logger.info(
            "Face detected — strategy={}, conf={:.4f}, "
            "bbox=({:.0f},{:.0f},{:.0f},{:.0f}), "
            "size={}x{} ({:.1f}% of {}x{} image), "
            "total_faces={}",
            strategy,
            float(largest.det_score),
            size[0], size[1], size[2], size[3],
            int(face_w), int(face_h),
            100.0 * face_w * face_h / (img_w * img_h),
            img_w, img_h,
            total,
        )

        result = self._build_result(image, largest, strategy)
        result.total_faces_detected = total
        return result
