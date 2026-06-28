"""BiSeNet face parsing provider — singleton wrapper for ONNX inference.

Handles model loading, image preprocessing, and inference for
semantic face segmentation. All ONNX / BiSeNet-specific logic
is isolated here so the rest of the application never imports
onnxruntime directly.
"""

import os
import threading
import urllib.error
import urllib.request

import cv2
import numpy as np
import onnxruntime as ort
from loguru import logger

_DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets",
    "models",
    "face_parsing.onnx",
)

_MODEL_URL = (
    "https://github.com/yakhyo/face-parsing/releases/download/weights/resnet18.onnx"
)

# Expected model file size range (bytes) for resnet18.onnx
# The model is ~43-45 MB when downloaded correctly.
_MIN_EXPECTED_BYTES = 40 * 1024 * 1024

_INPUT_SIZE = 512
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class FaceParsingProvider:
    """Singleton wrapper for a BiSeNet face parsing ONNX model.

    The model is loaded lazily on the first ``predict()`` call and
    reused for every subsequent request. CPU inference only.

    Usage:
        provider = FaceParsingProvider()
        mask = provider.predict(image_bgr)
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(
        cls, model_path: str | None = None
    ) -> "FaceParsingProvider":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialised = False
                    instance._model_path = model_path or _DEFAULT_MODEL_PATH
                    cls._instance = instance
        return cls._instance

    def __init__(self, model_path: str | None = None) -> None:
        if self._initialised:
            return
        self._session: ort.InferenceSession | None = None
        self._initialised = True

    @staticmethod
    def _ensure_model(model_path: str) -> None:
        """Download the BiSeNet ONNX model if it does not exist locally.

        Validates file integrity after download and retries once
        if the file appears truncated.
        """
        if os.path.isfile(model_path):
            actual = os.path.getsize(model_path)
            if actual >= _MIN_EXPECTED_BYTES:
                return
            logger.warning(
                "Model file {path} is suspiciously small ({size_mb:.1f} MB, "
                "expected >= {min_mb:.0f} MB). Re-downloading.",
                path=model_path,
                size_mb=actual / (1024 * 1024),
                min_mb=_MIN_EXPECTED_BYTES / (1024 * 1024),
            )
            os.remove(model_path)

        model_dir = os.path.dirname(model_path)
        os.makedirs(model_dir, exist_ok=True)
        logger.info("Downloading BiSeNet model from {}", _MODEL_URL)
        try:
            urllib.request.urlretrieve(_MODEL_URL, model_path)
        except (urllib.error.URLError, ConnectionError, OSError) as exc:
            if os.path.isfile(model_path):
                os.remove(model_path)
            raise RuntimeError(
                f"Failed to download model from {_MODEL_URL}: {exc}"
            ) from exc

        actual = os.path.getsize(model_path)
        if actual < _MIN_EXPECTED_BYTES:
            os.remove(model_path)
            raise RuntimeError(
                f"Downloaded model is too small ({actual / (1024 * 1024):.1f} MB). "
                f"Expected >= {_MIN_EXPECTED_BYTES / (1024 * 1024):.0f} MB. "
                f"Delete '{model_path}' and retry."
            )

        logger.info(
            "BiSeNet model downloaded ({size_mb:.1f} MB) to {path}",
            size_mb=actual / (1024 * 1024),
            path=model_path,
        )

    def _load(self) -> None:
        """Initialise the ONNX inference session (called once)."""
        if self._session is not None:
            return
        self._ensure_model(self._model_path)
        self._session = ort.InferenceSession(
            self._model_path,
            providers=["CPUExecutionProvider"],
        )

        inp = self._session.get_inputs()[0]
        out = self._session.get_outputs()[0]
        model_size = os.path.getsize(self._model_path) / (1024 * 1024)

        logger.info(
            "BiSeNet model loaded | "
            "ort={ort_ver} | "
            "model={size:.1f} MB | "
            "input={in_name} {in_shape} | "
            "output={out_name} {out_shape}",
            ort_ver=ort.__version__,
            size=model_size,
            in_name=inp.name,
            in_shape=inp.shape,
            out_name=out.name,
            out_shape=out.shape,
        )

    @staticmethod
    def _preprocess(image: np.ndarray) -> np.ndarray:
        """Resize, normalise, and batch an image for BiSeNet.

        Args:
            image: BGR numpy array at arbitrary size.

        Returns:
            Float32 tensor with shape ``(1, 3, 512, 512)``.
        """
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(
            rgb, (_INPUT_SIZE, _INPUT_SIZE), interpolation=cv2.INTER_LINEAR
        )

        tensor = resized.astype(np.float32) / 255.0
        tensor = (tensor - _MEAN) / _STD
        tensor = tensor.transpose(2, 0, 1)  # HWC → CHW
        tensor = np.expand_dims(tensor, axis=0)  # CHW → NCHW
        return tensor

    def predict(self, image: np.ndarray) -> np.ndarray:
        """Run face parsing inference on a BGR image.

        Args:
            image: BGR numpy array at any resolution.

        Returns:
            2-D uint8 class-index map with the same spatial
            dimensions as *image*. Each pixel holds an integer
            class label defined by the BiSeNet CelebAMask-HQ
            label scheme.
        """
        self._load()
        tensor = self._preprocess(image)

        input_name = self._session.get_inputs()[0].name
        output_name = self._session.get_outputs()[0].name
        raw = self._session.run([output_name], {input_name: tensor})[0]

        mask = np.argmax(raw.squeeze(0), axis=0).astype(np.uint8)

        h, w = image.shape[:2]
        if (h, w) != mask.shape:
            mask = cv2.resize(
                mask, (w, h), interpolation=cv2.INTER_NEAREST
            )

        return mask
