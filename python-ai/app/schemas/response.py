"""Response schemas for the GlamAI API.

Defines structured Pydantic models for all API responses.
"""

from pydantic import BaseModel


class Resolution(BaseModel):
    """Image resolution dimensions."""

    width: int
    height: int


class QualityMetrics(BaseModel):
    """Quality analysis results for an uploaded image."""

    resolution: Resolution
    brightness: float
    blur_score: float
    is_blurry: bool
    aspect_ratio: float


class FaceSize(BaseModel):
    """Bounding-box size of the detected face."""

    width: int
    height: int


class FaceMetrics(BaseModel):
    """Face detection and alignment results."""

    detected: bool
    confidence: float
    bounding_box: list[float]
    center: list[float]
    size: FaceSize
    face_area: int
    yaw: float | None = None
    pitch: float | None = None
    roll: float | None = None
    landmarks_detected: int | None = None
    aligned: bool


class LandmarksMetrics(BaseModel):
    """MediaPipe Face Mesh landmark results."""

    count: int
    detected: bool
    nose_tip: list[float]
    chin: list[float]
    left_eye: list[float]
    right_eye: list[float]
    mouth_center: list[float]
    points: list[list[float]]


class SegmentInfo(BaseModel):
    """Pixel count and coverage for a single semantic region."""

    pixels: int
    coverage: float


class ParsingMetrics(BaseModel):
    """Semantic face-parsing results."""

    skin: SegmentInfo
    hair: SegmentInfo
    nose: SegmentInfo
    neck: SegmentInfo
    background: SegmentInfo
    eyes: dict
    eyebrows: dict
    ears: dict
    lips: dict


class GeometryMetrics(BaseModel):
    """Geometric face measurements in pixels."""

    face_width: float
    face_height: float
    face_aspect_ratio: float
    jaw_width: float
    forehead_width: float
    cheekbone_width: float
    chin_width: float
    nose_width: float
    nose_length: float
    mouth_width: float
    eye_distance: float
    eye_width: float
    lip_height: float


class ShapeMetrics(BaseModel):
    """Face shape classification result."""

    type: str
    confidence: float
    reasoning: str


class SymmetryMetrics(BaseModel):
    """Facial symmetry breakdown."""

    overall: float
    jaw: float
    eyes: float
    eyebrows: float
    mouth: float
    nose: float


class GoldenRatioMetrics(BaseModel):
    """Golden-ratio proximity scores."""

    overall: float
    individual: dict


class SkinToneMetrics(BaseModel):
    """Skin-tone classification and colour-space metrics."""

    fitzpatrick: str
    fitzpatrick_description: str
    monk: int
    undertone: str
    confidence: float
    ita: float
    average_rgb: list[float]
    average_hsv: list[float]
    average_lab: list[float]
    average_ycbcr: list[float]
    brightness: float
    saturation: float


class SkinAnalysisMetrics(BaseModel):
    """Skin condition analysis results."""

    overall_skin_health: float
    acne: dict
    wrinkles: dict
    pigmentation: dict
    dark_circles: dict
    redness: dict
    pores: dict
    oiliness: dict


class AnalysisResponse(BaseModel):
    """Top-level response returned by the analysis pipeline."""

    status: str
    quality: QualityMetrics
    face: FaceMetrics
    landmarks: LandmarksMetrics
    parsing: ParsingMetrics
    geometry: GeometryMetrics
    shape: ShapeMetrics
    symmetry: SymmetryMetrics
    golden_ratio: GoldenRatioMetrics
    skin_tone: SkinToneMetrics | None = None
    skin_analysis: SkinAnalysisMetrics | None = None
    next_stage: str
