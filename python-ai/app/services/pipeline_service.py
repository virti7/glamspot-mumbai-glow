"""Pipeline orchestration service.

Coordinates the end-to-end beauty analysis pipeline stages:
validation, image loading, quality analysis, face detection
(with configurable fallback strategies), MediaPipe Face Mesh,
semantic face parsing, face geometry, skin-tone analysis, and
skin-condition analysis.
"""

from __future__ import annotations

from pathlib import Path

import base64

import cv2
import numpy as np
from fastapi import UploadFile
from loguru import logger

from app.config.face_detection import FaceDetectionConfig
from app.utils.image import validate_image, read_image, convert_to_numpy
from app.services.quality_service import QualityService
from app.services.face_service import FaceService
from app.services.landmark_service import LandmarkService
from app.services.parsing_service import ParsingService
from app.services.geometry_service import GeometryService
from app.services.skintone_service import SkintoneService
from app.services.skin_service import SkinService


def _encode_mask_compact(mask: np.ndarray) -> str:
    """Encode a 2D class-index mask as a base64 PNG string.

    PNG compression is very efficient for flat-colour masks (a few
    dozen unique values), keeping the serialised payload tiny.
    """
    _, buf = cv2.imencode(".png", mask.astype(np.uint8, copy=False))
    return base64.b64encode(buf).decode("ascii")


def decode_mask_compact(encoded: str) -> np.ndarray:
    """Decode a base64 PNG string back to a 2D uint8 mask."""
    buf = base64.b64decode(encoded)
    arr = np.frombuffer(buf, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)


class PipelineService:
    """Orchestrates the beauty analysis pipeline stages.

    Each stage is delegated to a dedicated service or utility
    module. The pipeline is responsible for ordering and data
    flow between stages.

    Attributes:
        face_config: Face detection configuration controlling
            preprocessing, thresholds, and fallback strategies.
    """

    def __init__(
        self,
        face_config: FaceDetectionConfig | None = None,
    ) -> None:
        self.face_config = face_config or FaceDetectionConfig.PRESET_AGGRESSIVE
        self._quality = QualityService()
        self._face = FaceService(config=self.face_config)
        self._landmarks = LandmarkService()
        self._parsing = ParsingService()
        self._geometry = GeometryService()
        self._skintone = SkintoneService()
        self._skin = SkinService()

    async def analyze(self, file: UploadFile) -> dict:
        """Execute the full analysis pipeline for an uploaded image.

        Steps:
            1. Read file bytes into memory.
            2. Validate extension, size, and integrity.
            3. Decode bytes into an OpenCV numpy array.
            4. Run classical quality analysis.
            5. Detect exactly one face and extract an aligned crop.
            6. Extract 468 MediaPipe Face Mesh landmarks.
            7. Run BiSeNet semantic face parsing.
            8. Compute face geometry, shape, symmetry,
               and golden-ratio scores.
            9. Run skin-tone analysis (Fitzpatrick, MONK, undertone).
            10. Run skin condition analysis (acne, wrinkles,
                pigmentation, dark circles, redness, pores,
                oiliness).
            11. Return structured result with all metrics.

        Args:
            file: FastAPI :class:`UploadFile` instance containing
                  the client's image.

        Returns:
            dict: Complete pipeline result.
        """
        content = await read_image(file)

        filename = file.filename or "unknown"
        validate_image(content, filename)
        logger.info("Validation passed for {name}", name=filename)

        image = convert_to_numpy(content)
        return self._run_pipeline(image, filename)

    def analyze_from_file(self, image_path: str | Path) -> dict:
        """Run full analysis pipeline on a local image file.

        Args:
            image_path: Path to a local image file (jpg, png, webp).
                Accepts both :class:`str` and :class:`pathlib.Path`.

        Returns:
            dict: Complete pipeline result matching AnalysisResponse schema.
        """
        path = image_path if isinstance(image_path, Path) else Path(image_path)
        content = path.read_bytes()
        validate_image(content, path.name)
        logger.info("Validation passed for {name}", name=path.name)
        image = convert_to_numpy(content)
        return self._run_pipeline(image, path.name)

    def _run_pipeline(self, image: np.ndarray, filename: str) -> dict:
        """Core pipeline logic shared by HTTP and file-based entry points.

        Args:
            image: Decoded BGR numpy array.
            filename: Original filename for logging.

        Returns:
            dict: Complete pipeline result.
        """
        height, width = image.shape[:2]
        logger.info("Decoded {w}x{h} image", w=width, h=height)

        quality = self._quality.analyze(image)

        face_result = self._face.analyze(image)
        face_metadata = face_result.metadata()

        # Log enhanced detection details
        logger.info(
            "Face detection result — strategy={}, detected={}, "
            "confidence={:.4f}, face_size={}x{}, "
            "image_size={}x{}, total_faces={}",
            face_result.detection_strategy,
            face_result.detected,
            face_result.confidence,
            face_result.size["width"],
            face_result.size["height"],
            image.shape[1],
            image.shape[0],
            face_result.total_faces_detected,
        )
        logger.info(
            "Detection params — det_size={}, det_thresh={}",
            self.face_config.detection_size,
            self.face_config.detection_threshold,
        )

        aligned = face_result.aligned_image

        landmark_result = self._landmarks.analyze(aligned)
        landmark_metadata = {
            "count": landmark_result.count,
            "detected": landmark_result.detected,
            "nose_tip": landmark_result.nose_tip,
            "chin": landmark_result.chin,
            "left_eye": landmark_result.left_eye,
            "right_eye": landmark_result.right_eye,
            "mouth_center": landmark_result.mouth_center,
            "points": landmark_result.points,
        }

        parsing_result = self._parsing.analyze(aligned)
        parsing_metadata = parsing_result.metadata()
        parsing_mask = parsing_result.mask

        geometry_result = self._geometry.analyze(landmark_result.points)

        skintone_result = self._skintone.analyze(aligned, parsing_result.mask)
        skintone_metadata = {
            "fitzpatrick": skintone_result.fitzpatrick,
            "fitzpatrick_description": skintone_result.fitzpatrick_description,
            "monk": skintone_result.monk,
            "undertone": skintone_result.undertone,
            "confidence": skintone_result.confidence,
            "ita": skintone_result.ita,
            "average_rgb": skintone_result.average_rgb,
            "average_hsv": skintone_result.average_hsv,
            "average_lab": skintone_result.average_lab,
            "average_ycbcr": skintone_result.average_ycbcr,
            "brightness": skintone_result.brightness,
            "saturation": skintone_result.saturation,
        }

        skin_result = self._skin.analyze(
            aligned, parsing_result.mask, landmark_result.points, skintone_result,
        )
        skin_metadata = {
            "overall_skin_health": skin_result.overall_skin_health,
            "acne": {
                "severity": skin_result.acne.severity,
                "count": skin_result.acne.count,
                "confidence": skin_result.acne.confidence,
            },
            "wrinkles": {
                "severity": skin_result.wrinkles.severity,
                "forehead": skin_result.wrinkles.forehead,
                "crow_feet": skin_result.wrinkles.crow_feet,
                "under_eye": skin_result.wrinkles.under_eye,
                "smile_lines": skin_result.wrinkles.smile_lines,
                "confidence": skin_result.wrinkles.confidence,
            },
            "pigmentation": {
                "severity": skin_result.pigmentation.severity,
                "confidence": skin_result.pigmentation.confidence,
            },
            "dark_circles": {
                "severity": skin_result.dark_circles.severity,
                "confidence": skin_result.dark_circles.confidence,
            },
            "redness": {
                "severity": skin_result.redness.severity,
                "confidence": skin_result.redness.confidence,
            },
            "pores": {
                "visibility": skin_result.pores.visibility,
                "confidence": skin_result.pores.confidence,
            },
            "oiliness": {
                "type": skin_result.oiliness.type,
                "confidence": skin_result.oiliness.confidence,
            },
        }

        logger.info("Pipeline completed successfully")

        return {
            "status": "success",
            "quality": quality,
            "face": face_metadata,
            "face_alignment_keypoints": face_result.alignment_keypoints,
            "affine_matrix": face_result.affine_matrix,
            "parsing_mask_encoded": _encode_mask_compact(parsing_mask),
            "parsing": parsing_metadata,
            "geometry": geometry_result.measurements,
            "shape": {
                "type": geometry_result.shape.type,
                "confidence": round(geometry_result.shape.confidence, 1),
                "reasoning": geometry_result.shape.reasoning,
            },
            "symmetry": geometry_result.symmetry,
            "golden_ratio": geometry_result.golden_ratio,
            "skin_tone": skintone_metadata,
            "skin_analysis": skin_metadata,
            "next_stage": "hair_analysis",
        }
