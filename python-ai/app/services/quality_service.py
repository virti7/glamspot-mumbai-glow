"""Image quality analysis service.

Performs non-AI quality checks on uploaded images including
resolution, brightness, blur detection, and aspect ratio.
"""

import cv2
import numpy as np
from loguru import logger

BLUR_THRESHOLD = 100.0


class QualityService:
    """Evaluates basic quality metrics for an image.

    All analysis is performed using classical computer vision
    techniques (OpenCV). No machine learning is involved.
    """

    def analyze(self, image: np.ndarray) -> dict:
        """Run quality analysis on the provided image.

        Computes resolution, mean brightness, Laplacian variance
        (blur score), blur classification, and aspect ratio.

        Args:
            image: BGR numpy array as returned by
                   :func:`app.utils.image.convert_to_numpy`.

        Returns:
            dict: Quality metrics with keys:
                - ``resolution``: ``{"width": int, "height": int}``
                - ``brightness``: float (mean pixel value, 0–255)
                - ``blur_score``: float (variance of Laplacian)
                - ``is_blurry``: bool
                - ``aspect_ratio``: float (width / height)
        """
        height, width = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        brightness = float(np.mean(gray))

        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = float(laplacian_var)
        is_blurry = blur_score < BLUR_THRESHOLD

        aspect_ratio = round(width / height, 2) if height > 0 else 0.0

        logger.info(
            "Quality — {w}x{h}, brightness={b:.1f}, blur={blur:.1f}, "
            "ratio={ratio}",
            w=width,
            h=height,
            b=brightness,
            blur=blur_score,
            ratio=aspect_ratio,
        )

        result = {
            "resolution": {
                "width": width,
                "height": height,
            },
            "brightness": round(brightness, 1),
            "blur_score": round(blur_score, 1),
            "is_blurry": is_blurry,
            "aspect_ratio": aspect_ratio,
        }

        if is_blurry:
            logger.warning("Image is blurry (score={score})", score=blur_score)

        return result
