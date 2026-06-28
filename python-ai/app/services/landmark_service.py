"""Landmark detection service.

Extracts 468 MediaPipe Face Mesh landmarks from an aligned face
crop and produces structured outputs with key facial reference
points for downstream analysis modules.
"""

from dataclasses import dataclass

import cv2
import numpy as np
from loguru import logger

from app.providers.mediapipe_provider import MediaPipeProvider

# MediaPipe Face Mesh canonical landmark indices
_NOSE_TIP = 1
_CHIN = 152
_LEFT_EYE_CORNERS = [33, 133]
_RIGHT_EYE_CORNERS = [263, 362]
_MOUTH_CORNERS = [61, 291]
_FOREHEAD = 10


@dataclass
class LandmarkResult:
    """Result produced by :meth:`LandmarkService.analyze`.

    Attributes:
        count: Number of detected landmarks (468 when successful).
        detected: Whether landmarks were successfully extracted.
        nose_tip: ``[x, y]`` pixel coordinates of the nose tip.
        chin: ``[x, y]`` pixel coordinates of the chin.
        left_eye: ``[x, y]`` pixel coordinates of the left eye centre.
        right_eye: ``[x, y]`` pixel coordinates of the right eye centre.
        mouth_center: ``[x, y]`` pixel coordinates of the mouth centre.
        forehead: ``[x, y]`` pixel coordinates of a forehead reference.
        points: All 468 landmark ``[x, y]`` pixel coordinates.
    """

    count: int
    detected: bool
    nose_tip: list[float]
    chin: list[float]
    left_eye: list[float]
    right_eye: list[float]
    mouth_center: list[float]
    forehead: list[float]
    points: list[list[float]]


def _midpoint(
    landmarks: list, idx_a: int, idx_b: int, width: int, height: int
) -> list[float]:
    """Compute the pixel-space midpoint between two landmark indices.

    Args:
        landmarks: List of MediaPipe ``NormalizedLandmark`` objects.
        idx_a: First landmark index.
        idx_b: Second landmark index.
        width: Image width in pixels.
        height: Image height in pixels.

    Returns:
        ``[x, y]`` pixel coordinates of the midpoint.
    """
    return [
        (landmarks[idx_a].x + landmarks[idx_b].x) * width / 2.0,
        (landmarks[idx_a].y + landmarks[idx_b].y) * height / 2.0,
    ]


def _single_point(
    landmarks: list, idx: int, width: int, height: int
) -> list[float]:
    """Convert a single normalized landmark to pixel coordinates.

    Args:
        landmarks: List of MediaPipe ``NormalizedLandmark`` objects.
        idx: Landmark index.
        width: Image width in pixels.
        height: Image height in pixels.

    Returns:
        ``[x, y]`` pixel coordinates.
    """
    return [landmarks[idx].x * width, landmarks[idx].y * height]


class LandmarkService:
    """Extracts and structures 468 facial landmarks from an aligned face.

    Framework-agnostic — operates on numpy arrays and returns a
    :class:`LandmarkResult` dataclass.
    """

    def __init__(self) -> None:
        self._provider = MediaPipeProvider()

    def analyze(self, image: np.ndarray) -> LandmarkResult:
        """Run MediaPipe Face Mesh and structure the output.

        Args:
            image: Aligned BGR face crop (e.g. from InsightFace
                   alignment).

        Returns:
            :class:`LandmarkResult` with all 468 landmarks and key
            facial reference points.

        Raises:
            ValueError: If MediaPipe fails to detect landmarks on
                the provided image.
        """
        height, width = image.shape[:2]
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        face_landmarks = self._provider.process(image_rgb)

        if face_landmarks is None:
            raise ValueError(
                "MediaPipe Face Mesh could not detect landmarks on "
                "the aligned face image"
            )

        landmarks = face_landmarks.landmark
        points = [
            [lm.x * width, lm.y * height] for lm in landmarks
        ]

        nose_tip = _single_point(landmarks, _NOSE_TIP, width, height)
        chin = _single_point(landmarks, _CHIN, width, height)
        left_eye = _midpoint(
            landmarks, _LEFT_EYE_CORNERS[0], _LEFT_EYE_CORNERS[1], width, height
        )
        right_eye = _midpoint(
            landmarks, _RIGHT_EYE_CORNERS[0], _RIGHT_EYE_CORNERS[1], width, height
        )
        mouth_center = _midpoint(
            landmarks, _MOUTH_CORNERS[0], _MOUTH_CORNERS[1], width, height
        )
        forehead = _single_point(landmarks, _FOREHEAD, width, height)

        logger.info(
            "MediaPipe extracted {count} landmarks — "
            "nose=({nx:.0f},{ny:.0f}), "
            "left_eye=({lex:.0f},{ley:.0f}), "
            "right_eye=({rex:.0f},{rey:.0f})",
            count=len(points),
            nx=nose_tip[0],
            ny=nose_tip[1],
            lex=left_eye[0],
            ley=left_eye[1],
            rex=right_eye[0],
            rey=right_eye[1],
        )

        return LandmarkResult(
            count=len(points),
            detected=True,
            nose_tip=nose_tip,
            chin=chin,
            left_eye=left_eye,
            right_eye=right_eye,
            mouth_center=mouth_center,
            forehead=forehead,
            points=points,
        )
