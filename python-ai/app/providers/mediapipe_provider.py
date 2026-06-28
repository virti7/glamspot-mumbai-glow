"""MediaPipe provider — singleton wrapper around FaceLandmarker (Tasks API).

Handles model initialisation and landmark detection. All MediaPipe-
specific logic is isolated here so the rest of the application never
imports MediaPipe directly.
"""

import os
import threading
import urllib.request

import numpy as np
from loguru import logger

from mediapipe.tasks.python.vision.face_landmarker import (
    FaceLandmarker,
)
from mediapipe.tasks.python.vision.core.image import Image, ImageFormat

MIN_DETECTION_CONFIDENCE = 0.5

_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
)
_MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
)
_MODEL_PATH = os.path.join(_MODEL_DIR, "face_landmarker.task")


class _LandmarksAdapter:
    """Adapter that wraps a list of NormalizedLandmark objects
    to preserve the old MultiFaceLandmarks.landmark interface.
    """

    def __init__(self, landmarks: list) -> None:
        self.landmark = landmarks


class MediaPipeProvider:
    """Singleton wrapper for MediaPipe FaceLandmarker (Tasks API).

    Downloads the model on first use if not already present.
    Thread-safe single initialisation.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls) -> "MediaPipeProvider":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialised = False
                    cls._instance = instance
        return cls._instance

    def __init__(self) -> None:
        if self._initialised:
            return
        self._ensure_model()
        self._landmarker = FaceLandmarker.create_from_model_path(_MODEL_PATH)
        self._initialised = True
        logger.info(
            "MediaPipe FaceLandmarker initialised — model={}, confidence={}",
            _MODEL_PATH,
            MIN_DETECTION_CONFIDENCE,
        )

    @staticmethod
    def _ensure_model() -> None:
        """Download the face_landmarker.task model if it does not exist locally."""
        if os.path.isfile(_MODEL_PATH):
            return
        os.makedirs(_MODEL_DIR, exist_ok=True)
        logger.info("Downloading face_landmarker.task from {}", _MODEL_URL)
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)
        logger.info("Model downloaded to {}", _MODEL_PATH)

    def process(self, image_rgb: np.ndarray) -> object | None:
        """Run FaceLandmarker on an RGB image.

        Args:
            image_rgb: RGB numpy array (not BGR).

        Returns:
            An adapter with a ``.landmark`` attribute containing the
            list of ``NormalizedLandmark`` objects if a face is detected,
            otherwise ``None``.
        """
        mp_image = Image(ImageFormat.SRGB, image_rgb)
        result = self._landmarker.detect(mp_image)
        if result.face_landmarks:
            return _LandmarksAdapter(result.face_landmarks[0])
        return None
