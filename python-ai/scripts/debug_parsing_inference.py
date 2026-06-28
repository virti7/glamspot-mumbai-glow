#!/usr/bin/env python3
"""Debug the face parsing inference: preprocessing, ONNX, argmax.

Saves:
  01_input_original.jpg        – original image (resized to 800px wide)
  02_aligned_face.jpg          – the aligned face crop (input to parser)
  03_preprocessed_tensor.png   – what the ONNX model actually sees
  04_raw_channels.txt          – stats for every output channel
  05_class_mask.png            – final argmax class-index mask
  06_colorized_overlay.png     – colorized segmentation over the aligned face
  report.txt                   – summary of what was found
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.providers.faceparsing_provider import FaceParsingProvider
from app.services.pipeline_service import PipelineService, decode_mask_compact
from app.config.face_detection import FaceDetectionConfig

OUTPUT_DIR = Path("debug_parsing_inference")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# CelebAMask-HQ class colours (BGR) for visualisation
_CLASS_COLORS: list[tuple[int, int, int]] = [
    (0, 0, 0),        # 0  background
    (255, 182, 193),  # 1  skin
    (0, 0, 255),      # 2  l_brow
    (0, 128, 255),    # 3  r_brow
    (255, 255, 0),    # 4  l_eye
    (128, 255, 0),    # 5  r_eye
    (255, 0, 0),      # 6  eye_g
    (192, 192, 192),  # 7  l_ear
    (128, 128, 192),  # 8  r_ear
    (255, 0, 255),    # 9  ear_r
    (0, 165, 255),    # 10 nose
    (0, 0, 128),      # 11 mouth
    (0, 0, 255),      # 12 u_lip
    (0, 0, 200),      # 13 l_lip
    (255, 255, 255),  # 14 neck
    (128, 0, 128),    # 15 neck_l
    (128, 128, 128),  # 16 cloth
    (0, 255, 0),      # 17 hair
    (0, 128, 128),    # 18 hat
]

_CLASS_NAMES = [
    "background", "skin", "l_brow", "r_brow", "l_eye",
    "r_eye", "eye_g", "l_ear", "r_ear", "ear_r",
    "nose", "mouth", "u_lip", "l_lip", "neck",
    "neck_l", "cloth", "hair", "hat",
]


def _colorize(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(_CLASS_COLORS):
        color[mask == cls_idx] = bgr
    return color


def _resize_to_max_width(img: np.ndarray, max_w: int = 800) -> np.ndarray:
    h, w = img.shape[:2]
    if w <= max_w:
        return img
    ratio = max_w / w
    return cv2.resize(img, (max_w, int(h * ratio)), interpolation=cv2.INTER_LINEAR)


def _tensor_stats(t: np.ndarray, label: str) -> None:
    print(f"\n  [{label}]")
    print(f"    shape:    {t.shape}")
    print(f"    dtype:    {t.dtype}")
    print(f"    range:    [{t.min():.6f}, {t.max():.6f}]")
    print(f"    mean:     {t.mean():.6f}")
    print(f"    std:      {t.std():.6f}")
    if t.ndim >= 2:
        nan_count = np.isnan(t).sum()
        inf_count = np.isinf(t).sum()
        if nan_count > 0:
            print(f"    *** {nan_count} NaN values! ***")
        if inf_count > 0:
            print(f"    *** {inf_count} Inf values! ***")


def main() -> None:
    print("=" * 70)
    print("  FACE PARSING INFERENCE DEBUG")
    print("=" * 70)

    # ── Pick a test image ──
    # Try benchmark images first, then fall back to the CelebA source
    test_candidates = [
        Path("D:/AI-Dataset/GlamAI-Benchmark/images/18.jpg"),
        Path("D:/AI-Dataset/GlamAI-Benchmark/images/106.jpg"),
        Path("D:/AI-Dataset/GlamAI-Benchmark/images/29967.jpg"),
        Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ/CelebA-HQ-img/18.jpg"),
    ]

    img_path = None
    for p in test_candidates:
        if p.is_file():
            img_path = p
            break

    if img_path is None:
        print("ERROR: No test image found. Check paths above.")
        sys.exit(1)

    print(f"\nTest image: {img_path}")
    original = cv2.imread(str(img_path))
    if original is None:
        print(f"ERROR: Failed to read {img_path}")
        sys.exit(1)

    print(f"  Original shape: {original.shape}  (H x W x C)")

    # Save resized original for reference
    cv2.imwrite(str(OUTPUT_DIR / "01_input_original.jpg"),
                _resize_to_max_width(original))

    # ── 1. Run pipeline to get aligned face ──
    print("\n── Step 1: Pipeline (face detection + alignment) ──")
    pipe = PipelineService(face_config=FaceDetectionConfig.PRESET_AGGRESSIVE)
    result = pipe.analyze_from_file(str(img_path))

    if result.get("status") != "success":
        print(f"Pipeline failed: {result.get('error')}")
        sys.exit(1)

    face_meta = result["face"]
    if not face_meta.get("detected"):
        print("No face detected!")
        sys.exit(1)

    aligned = pipe._face._build_result(
        original,
        pipe._face._provider.detect(original)[0],
        "debug",
    ).aligned_image

    # Also get the aligned image from the pipeline (re-run to capture it)
    # Actually we need to re-access the aligned image. Let's use a simpler approach:
    # Re-run face detection and alignment directly.
    from app.providers.insightface_provider import InsightFaceProvider
    if_provider = InsightFaceProvider()
    if_provider.configure(det_size=(640, 640), det_thresh=0.5)
    faces = if_provider.detect(original)
    if not faces:
        print("No faces detected by InsightFace!")
        sys.exit(1)
    largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    aligned_face = if_provider.get_aligned_face(original, largest)

    print(f"  Aligned face shape: {aligned_face.shape}  (H x W x C)")
    kps = largest.kps.tolist() if hasattr(largest, 'kps') and largest.kps is not None else None
    print(f"  Keypoints: {kps}")
    cv2.imwrite(str(OUTPUT_DIR / "02_aligned_face.jpg"), aligned_face)

    # ── 2. Manual preprocessing ──
    print("\n── Step 2: Preprocessing (BGR → RGB → 512×512 → norm → NCHW) ──")
    rgb = cv2.cvtColor(aligned_face, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (512, 512), interpolation=cv2.INTER_LINEAR)
    _tensor_stats(resized, "After resize (RGB, uint8)")

    # Save what the model sees
    cv2.imwrite(str(OUTPUT_DIR / "03_preprocessed_tensor.png"),
                cv2.cvtColor(resized, cv2.COLOR_RGB2BGR))

    # Normalisation
    _MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    _STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tensor = resized.astype(np.float32) / 255.0
    _tensor_stats(tensor, "After /255.0")
    tensor = (tensor - _MEAN) / _STD
    _tensor_stats(tensor, "After ImageNet norm")
    tensor = tensor.transpose(2, 0, 1)  # HWC → CHW
    tensor = np.expand_dims(tensor, axis=0)  # → NCHW
    _tensor_stats(tensor, "Final input tensor (NCHW)")

    # ── 3. ONNX Model details ──
    print("\n── Step 3: ONNX Model Inspection ──")
    import onnxruntime as ort

    model_path = Path(__file__).resolve().parent.parent / "app" / "assets" / "models" / "face_parsing.onnx"
    if not model_path.is_file():
        print(f"ERROR: Model not found at {model_path}")
        # Try downloading
        print("Downloading BiSeNet model...")
        import urllib.request
        model_path.parent.mkdir(parents=True, exist_ok=True)
        url = "https://github.com/yakhyo/face-parsing/releases/download/weights/resnet18.onnx"
        urllib.request.urlretrieve(url, str(model_path))
        print(f"Downloaded to {model_path}")

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])

    for i, inp in enumerate(session.get_inputs()):
        print(f"  Input  [{i}]: name={inp.name}, shape={inp.shape}, type={inp.type}")
    for i, out in enumerate(session.get_outputs()):
        print(f"  Output [{i}]: name={out.name}, shape={out.shape}, type={out.type}")

    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    # ── 4. Run inference ──
    print("\n── Step 4: Inference ──")
    raw = session.run([output_name], {input_name: tensor})[0]
    _tensor_stats(raw, "Raw output")

    # Squeeze batch dim
    logits = raw.squeeze(0)  # (C, H, W)
    print(f"\n  Logits shape: {logits.shape} (C x H x W)")

    # ── 5. Per-channel statistics ──
    print("\n── Step 5: Per-output-channel statistics ──")
    lines = []
    lines.append(f"{'Channel':>8} {'Class':<20} {'Min':>10} {'Max':>10} {'Mean':>10} {'Std':>10}")
    lines.append("-" * 70)
    for c in range(logits.shape[0]):
        ch = logits[c]
        name = _CLASS_NAMES[c] if c < len(_CLASS_NAMES) else f"class_{c}"
        lines.append(
            f"{c:>8} {name:<20} {ch.min():>10.4f} {ch.max():>10.4f} "
            f"{ch.mean():>10.4f} {ch.std():>10.4f}"
        )
    report = "\n".join(lines)
    print(report)

    with open(OUTPUT_DIR / "04_raw_channels.txt", "w") as f:
        f.write(report + "\n")

    # ── 6. Argmax ──
    print("\n── Step 6: Argmax decoding ──")
    mask = np.argmax(logits, axis=0).astype(np.uint8)
    print(f"  Mask shape: {mask.shape}")
    print(f"  Unique classes in mask: {sorted(np.unique(mask).tolist())}")
    for c in sorted(np.unique(mask)):
        count = int((mask == c).sum())
        pct = count / mask.size * 100
        name = _CLASS_NAMES[c] if c < len(_CLASS_NAMES) else f"class_{c}"
        print(f"    Class {c:2d} ({name:<20s}): {count:>8d} px ({pct:>5.2f}%)")

    cv2.imwrite(str(OUTPUT_DIR / "05_class_mask.png"), mask)

    # ── 7. Colorized overlay ──
    print("\n── Step 7: Overlay ──")
    color_mask = _colorize(mask)
    # Resize mask to match aligned face
    h, w = aligned_face.shape[:2]
    color_mask_resized = cv2.resize(color_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    overlay = cv2.addWeighted(aligned_face, 0.6, color_mask_resized, 0.4, 0)

    # Side-by-side: aligned face | overlay
    side_by_side = np.hstack([aligned_face, overlay])
    cv2.imwrite(str(OUTPUT_DIR / "06_colorized_overlay.png"), side_by_side)

    # ── 8. Compare pipeline output vs direct inference ──
    print("\n── Step 8: Direct inference vs Pipeline output ──")
    # The pipeline's mask is in the aligned face's coordinate space
    pipeline_mask = decode_mask_compact(result["parsing_mask_encoded"])
    print(f"  Pipeline mask shape: {pipeline_mask.shape}")
    print(f"  Direct inference mask shape: {mask.shape}")

    # The pipeline resizes the model output (512×512) back to the original
    # aligned face size (112×112). Compare.
    if pipeline_mask.shape != mask.shape:
        # Direct inference mask is at 512×512. Resize to aligned_face size.
        mask_resized = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
    else:
        mask_resized = mask

    matches = (pipeline_mask == mask_resized).sum()
    total = pipeline_mask.size
    print(f"  Pipeline mask vs direct inference (at aligned face size):")
    print(f"    Pixels matching: {matches}/{total} ({100*matches/total:.1f}%)")
    if matches != total:
        diff = pipeline_mask != mask_resized
        print(f"    Differences: {int(diff.sum())} pixels")
        print(f"    *** MISMATCH — pipeline postprocessing diverges! ***")

    # ── 9. Report ──
    print("\n── DIAGNOSIS ──")
    issues = []

    # Check preprocessing dimensions
    if aligned_face.shape[0] != 512 or aligned_face.shape[1] != 512:
        issues.append(
            f"Aligned face is {aligned_face.shape[0]}x{aligned_face.shape[1]} "
            f"— upscaled to 512×512 for model. Upscaling factor: "
            f"{512/aligned_face.shape[1]:.1f}x horizontal, "
            f"{512/aligned_face.shape[0]:.1f}x vertical. "
            f"This introduces significant blur/interpolation artifacts."
        )

    # Check output spatial dimensions
    if logits.shape[1] != 512 or logits.shape[2] != 512:
        issues.append(
            f"Model output spatial dims are {logits.shape[1]}x{logits.shape[2]}, "
            f"not 512×512. Output will be resized to {aligned_face.shape[0]}x{aligned_face.shape[1]}."
        )

    # Check if many classes have very low max logits (indicating they never fire)
    dead_channels = []
    for c in range(logits.shape[0]):
        if logits[c].max() < logits.max() * 0.1:
            dead_channels.append(c)
    if dead_channels:
        issues.append(
            f"Channels with very low activation: {dead_channels} "
            f"({[f'{i}({_CLASS_NAMES[i]})' for i in dead_channels]})"
        )

    # Check if a single class dominates
    dominant_class = np.argmax(np.bincount(mask.ravel()))
    dom_pct = (mask == dominant_class).sum() / mask.size * 100
    if dominant_class == 0:
        issues.append(
            f"Background (class 0) dominates at {dom_pct:.1f}% of mask. "
            f"This could mean the model doesn't fire foreground classes on aligned crops."
        )
    elif dom_pct > 80:
        issues.append(
            f"Class {dominant_class} ({_CLASS_NAMES[dominant_class]}) "
            f"dominates at {dom_pct:.1f}%."
        )

    issues.append(
        f"Input image size: {original.shape[0]}x{original.shape[1]} → "
        f"aligned face: {aligned_face.shape[0]}x{aligned_face.shape[1]} → "
        f"model input: 512×512 → model output: {logits.shape[1]}x{logits.shape[2]}"
    )

    with open(OUTPUT_DIR / "report.txt", "w", encoding="utf-8") as f:
        for i, issue in enumerate(issues, 1):
            f.write(f"{i}. {issue}\n")
            print(f"  {i}. {issue}")

    print(f"\nAll outputs saved to: {OUTPUT_DIR.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()
