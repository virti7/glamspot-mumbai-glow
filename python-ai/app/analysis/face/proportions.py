"""Facial proportion measurements from MediaPipe landmarks.

All measurements are derived from the 468-point MediaPipe Face Mesh
coordinate system. Each function accepts the full list of 468
``[x, y]`` pixel-coordinate pairs and returns a scalar pixel value.
"""

# MediaPipe Face Mesh canonical landmark indices
# Reference: https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection

# --- Nose ---
_NOSE_TIP = 1
_NOSE_BRIDGE = 168       # nasion (between eyes)
_NOSE_BOTTOM = 2          # subnasale
_NOSE_LEFT = 49           # left alar (nostril wing)
_NOSE_RIGHT = 279         # right alar

# --- Eyes ---
_LEFT_EYE_OUTER = 33
_LEFT_EYE_INNER = 133
_RIGHT_EYE_INNER = 362
_RIGHT_EYE_OUTER = 263

# --- Jaw & Chin ---
_CHIN = 152               # gnathion (bottom of chin)
_LEFT_JAW = 172           # left gonion (jaw angle)
_RIGHT_JAW = 397          # right gonion
_LEFT_CHIN = 58           # left side of chin contour
_RIGHT_CHIN = 288         # right side of chin contour

# --- Forehead & Cheekbones ---
_FOREHEAD_TOP = 10        # trichion area
_LEFT_TEMPLE = 50         # left temple region
_RIGHT_TEMPLE = 280       # right temple region
_LEFT_CHEEK = 234         # left zygion (cheekbone)
_RIGHT_CHEEK = 454        # right zygion

# --- Mouth ---
_MOUTH_LEFT = 61
_MOUTH_RIGHT = 291
_UPPER_LIP_TOP = 0
_LOWER_LIP_BOTTOM = 17

# --- Eyebrows (for facial-thirds landmarks) ---
_LEFT_EYEBROW_TOP = 105   # peak of left eyebrow
_RIGHT_EYEBROW_TOP = 334  # peak of right eyebrow


def _pt(pts: list[list[float]], idx: int) -> list[float]:
    """Convenience accessor: one point from the landmark list."""
    return pts[idx]


def _hdist(pts: list[list[float]], a: int, b: int) -> float:
    """Horizontal distance (absolute *x* difference) in pixels."""
    return abs(pts[a][0] - pts[b][0])


def _vdist(pts: list[list[float]], a: int, b: int) -> float:
    """Vertical distance (absolute *y* difference) in pixels."""
    return abs(pts[a][1] - pts[b][1])


# ---------------------------------------------------------------------------
# Public measurement routines
# ---------------------------------------------------------------------------


def face_width(pts: list[list[float]]) -> float:
    """Width between the widest points across the cheekbones."""
    return _hdist(pts, _LEFT_CHEEK, _RIGHT_CHEEK)


def face_height(pts: list[list[float]]) -> float:
    """Vertical distance from forehead top to chin bottom."""
    return _vdist(pts, _FOREHEAD_TOP, _CHIN)


def face_aspect_ratio(pts: list[list[float]]) -> float:
    """Height-to-width ratio of the overall face."""
    h = face_height(pts)
    w = face_width(pts)
    return round(h / w, 2) if w > 0 else 0.0


def jaw_width(pts: list[list[float]]) -> float:
    """Distance between the left and right jaw angles (gonions)."""
    return _hdist(pts, _LEFT_JAW, _RIGHT_JAW)


def forehead_width(pts: list[list[float]]) -> float:
    """Width between the left and right temple regions."""
    return _hdist(pts, _LEFT_TEMPLE, _RIGHT_TEMPLE)


def cheekbone_width(pts: list[list[float]]) -> float:
    """Alias for :func:`face_width`."""
    return face_width(pts)


def chin_width(pts: list[list[float]]) -> float:
    """Width across the chin at its widest visible contour."""
    return _hdist(pts, _LEFT_CHIN, _RIGHT_CHIN)


def nose_width(pts: list[list[float]]) -> float:
    """Width across the nose alar (nostril wings)."""
    return _hdist(pts, _NOSE_LEFT, _NOSE_RIGHT)


def nose_length(pts: list[list[float]]) -> float:
    """Vertical length from nasion to subnasale."""
    return _vdist(pts, _NOSE_BRIDGE, _NOSE_BOTTOM)


def mouth_width(pts: list[list[float]]) -> float:
    """Width between the left and right mouth corners."""
    return _hdist(pts, _MOUTH_LEFT, _MOUTH_RIGHT)


def eye_distance(pts: list[list[float]]) -> float:
    """Distance between the inner corners of the eyes."""
    return _hdist(pts, _LEFT_EYE_INNER, _RIGHT_EYE_INNER)


def eye_width(pts: list[list[float]]) -> float:
    """Average horizontal width of both eyes."""
    left = _hdist(pts, _LEFT_EYE_OUTER, _LEFT_EYE_INNER)
    right = _hdist(pts, _RIGHT_EYE_INNER, _RIGHT_EYE_OUTER)
    return (left + right) / 2.0


def lip_height(pts: list[list[float]]) -> float:
    """Vertical distance from upper-lip top to lower-lip bottom."""
    return _vdist(pts, _UPPER_LIP_TOP, _LOWER_LIP_BOTTOM)


# ---------------------------------------------------------------------------
# Facial thirds
# ---------------------------------------------------------------------------


def facial_thirds(pts: list[list[float]]) -> dict[str, float]:
    """Vertical heights of the three facial thirds.

    Returns:
        dict with keys ``upper``, ``middle``, ``lower`` (pixels).
    """
    # Approximate eyebrow y-level using the average of left/right brow peaks
    brow_y = (pts[_LEFT_EYEBROW_TOP][1] + pts[_RIGHT_EYEBROW_TOP][1]) / 2.0

    upper = abs(pts[_FOREHEAD_TOP][1] - brow_y)
    middle = abs(brow_y - pts[_NOSE_BOTTOM][1])
    lower = abs(pts[_NOSE_BOTTOM][1] - pts[_CHIN][1])

    return {"upper": round(upper, 1), "middle": round(middle, 1), "lower": round(lower, 1)}


# ---------------------------------------------------------------------------
# Facial fifths
# ---------------------------------------------------------------------------


def facial_fifths(pts: list[list[float]]) -> dict[str, float]:
    """Horizontal fifths of the face and the eye-offset ratios.

    Returns:
        dict with ``segment_width`` (one fifth in pixels) and
        ``left_eye_offset`` / ``right_eye_offset`` which indicate
        how far each eye centre sits from the nearest fifth boundary
        (0 = perfectly aligned, lower = better).
    """
    fw = face_width(pts)
    fifth = fw / 5.0

    face_left_x = min(pts[_LEFT_TEMPLE][0], pts[_LEFT_CHEEK][0])
    left_eye_x = (pts[_LEFT_EYE_OUTER][0] + pts[_LEFT_EYE_INNER][0]) / 2.0
    right_eye_x = (pts[_RIGHT_EYE_INNER][0] + pts[_RIGHT_EYE_OUTER][0]) / 2.0

    # Ideal: left eye centre at 1/5, right eye centre at 3/5 from the left
    ideal_left = face_left_x + fifth * 1
    ideal_right = face_left_x + fifth * 3

    return {
        "segment_width": round(fifth, 1),
        "left_eye_offset": round(abs(left_eye_x - ideal_left), 1),
        "right_eye_offset": round(abs(right_eye_x - ideal_right), 1),
    }


# ---------------------------------------------------------------------------
# Composite
# ---------------------------------------------------------------------------


def all_measurements(pts: list[list[float]]) -> dict[str, float]:
    """Compute every proportion measurement in one call.

    Args:
        pts: 468 MediaPipe landmarks as ``[x, y]`` pixel coordinates.

    Returns:
        Flat dict of measurement names to pixel values.
    """
    return {
        "face_width": round(face_width(pts), 1),
        "face_height": round(face_height(pts), 1),
        "face_aspect_ratio": face_aspect_ratio(pts),
        "jaw_width": round(jaw_width(pts), 1),
        "forehead_width": round(forehead_width(pts), 1),
        "cheekbone_width": round(cheekbone_width(pts), 1),
        "chin_width": round(chin_width(pts), 1),
        "nose_width": round(nose_width(pts), 1),
        "nose_length": round(nose_length(pts), 1),
        "mouth_width": round(mouth_width(pts), 1),
        "eye_distance": round(eye_distance(pts), 1),
        "eye_width": round(eye_width(pts), 1),
        "lip_height": round(lip_height(pts), 1),
    }
