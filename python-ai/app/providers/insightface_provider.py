"""InsightFace provider — singleton wrapper around FaceAnalysis.

Handles model initialisation, face detection, and face alignment.
All InsightFace-specific logic is isolated here so the rest of
the application never imports InsightFace directly.

The singleton ensures the model is loaded once per process, but
detection parameters (``det_size``, ``det_thresh``) can be updated
between calls via :meth:`configure`.
"""

from __future__ import annotations

import threading
from typing import Any

import numpy as np
from insightface.app import FaceAnalysis
from insightface.utils import face_align
from loguru import logger

APP_NAME = "buffalo_l"
DEFAULT_DET_SIZE = (640, 640)
DEFAULT_DET_THRESH = 0.5


class InsightFaceProvider:
    """Singleton wrapper for InsightFace's FaceAnalysis pipeline.

    The model is loaded exactly once (thread-safe) and reused for
    every detection request. Detection parameters can be overridden
    by calling :meth:`configure` *before* the first detection.

    Usage:
        provider = InsightFaceProvider()
        provider.configure(det_size=(960, 960), det_thresh=0.3)
        faces = provider.detect(image)
        aligned = provider.get_aligned_face(image, faces[0])
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls) -> "InsightFaceProvider":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialised = False
                    instance._det_size = DEFAULT_DET_SIZE
                    instance._det_thresh = DEFAULT_DET_THRESH
                    cls._instance = instance
        return cls._instance

    def __init__(self) -> None:
        if self._initialised:
            return
        self._app = FaceAnalysis(name=APP_NAME)
        self._app.prepare(ctx_id=-1, det_size=self._det_size, det_thresh=self._det_thresh)
        self._initialised = True
        logger.info(
            "InsightFace initialised — model={model}, ctx=CPU, "
            "det_size={size}, det_thresh={thresh}",
            model=APP_NAME,
            size=self._det_size,
            thresh=self._det_thresh,
        )

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------

    def configure(
        self,
        det_size: tuple[int, int] | None = None,
        det_thresh: float | None = None,
    ) -> None:
        """Update detection parameters on the loaded model.

        Calling ``prepare`` with new parameters is lightweight once
        the model has already been initialised; it does not re-download
        weights.

        Args:
            det_size: (width, height) input size for the detection
                model. ``None`` keeps the current value.
            det_thresh: Confidence threshold. Lower values increase
                recall. ``None`` keeps the current value.
        """
        if det_size is None and det_thresh is None:
            return
        if det_size is not None:
            self._det_size = det_size
        if det_thresh is not None:
            self._det_thresh = det_thresh
        if self._initialised:
            self._app.prepare(ctx_id=-1, det_size=self._det_size, det_thresh=self._det_thresh)
            logger.debug(
                "InsightFace re-configured — det_size={size}, det_thresh={thresh}",
                size=self._det_size,
                thresh=self._det_thresh,
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, image: np.ndarray) -> list[Any]:
        """Run face detection on the given image.

        Args:
            image: BGR numpy array as returned by OpenCV.

        Returns:
            list of InsightFace ``Face`` objects, each containing
            ``bbox``, ``det_score``, ``kps``, ``landmark`` and
            ``pose`` attributes when available.
        """
        return self._app.get(image)

    def get_aligned_face(self, image: np.ndarray, face: Any) -> np.ndarray:
        """Extract and align a face crop using 5-point landmarks.

        The face is normalised via similarity transform so that the
        eyes are horizontally aligned and the crop is centred on the
        face.

        Args:
            image: Original BGR image.
            face: A single InsightFace ``Face`` object (must contain
                  ``kps`` — the 5 facial keypoints).

        Returns:
            Aligned face crop as a BGR numpy array, typically
            112×112 or 112×96 depending on the model definition.
        """
        return face_align.norm_crop(image, face.kps, image_size=512)
