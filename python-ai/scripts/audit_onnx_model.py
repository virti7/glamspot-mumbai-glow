#!/usr/bin/env python3
"""Audit ONNX face parsing model: compare aligned-crop vs full-image inference."""

from __future__ import annotations

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import numpy as np
import cv2
import onnxruntime as ort

from insightface.utils import face_align

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")
OUTPUT_DIR = Path("onnx_audit")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def colorize(mask: np.ndarray) -> np.ndarray:
    colors = [
        (0, 0, 0), (255, 182, 193), (0, 0, 255), (0, 128, 255),
        (255, 255, 0), (128, 255, 0), (255, 0, 0), (192, 192, 192),
        (128, 128, 192), (255, 0, 255), (0, 165, 255), (0, 0, 128),
        (0, 0, 255), (0, 0, 200), (255, 255, 255), (128, 0, 128),
        (128, 128, 128), (0, 255, 0), (0, 128, 128),
    ]
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(colors):
        color[mask == cls_idx] = bgr
    return color


# =========================================================================
# Part 1: Inspect ONNX model metadata
# =========================================================================

print("=" * 70)
print("PART 1: ONNX Model Inspection")
print("=" * 70)

model_path = _PROJECT_ROOT / "app" / "assets" / "models" / "face_parsing.onnx"
if not model_path.is_file():
    print(f"ERROR: Model not found at {model_path}")
    print("Run: python scripts/download_bisenet.py")
    sys.exit(1)

print(f"Model file: {model_path}")
size_mb = model_path.stat().st_size / (1024 * 1024)
print(f"Model size: {size_mb:.1f} MB")
if size_mb < 40:
    print("  ⚠ WARNING: Model is smaller than expected (should be ~43-45 MB)")

session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
print(f"ONNX Runtime version: {ort.__version__}")
print(f"Execution provider: {session.get_providers()[0]}")

for i, inp in enumerate(session.get_inputs()):
    print(f"\nInput [{i}]:")
    print(f"  name:     {inp.name}")
    print(f"  shape:    {inp.shape}")
    print(f"  dtype:    {inp.type}")

for i, out in enumerate(session.get_outputs()):
    print(f"\nOutput [{i}]:")
    print(f"  name:     {out.name}")
    print(f"  shape:    {out.shape}")
    print(f"  dtype:    {out.type}")

# =========================================================================
# Part 2: Load a test image
# =========================================================================

print("\n" + "=" * 70)
print("PART 2: Load test image (CelebA-HQ 18)")
print("=" * 70)

image_id = 18
filename = "18.jpg"
img_path = BENCHMARK_DIR / "images" / filename
if not img_path.is_file():
    img_path = CELEBA_SRC / "CelebA-HQ-img" / filename

original_bgr = cv2.imread(str(img_path))
if original_bgr is None:
    print(f"ERROR: Cannot read image at {img_path}")
    sys.exit(1)

print(f"Image: {img_path}")
print(f"Original shape: {original_bgr.shape}")

# Detect face to get landmarks for alignment
print("\n--- Detecting face ---")
from app.providers.insightface_provider import InsightFaceProvider

detector = InsightFaceProvider()
detector.configure(det_size=(640, 640), det_thresh=0.5)
faces = detector.detect(original_bgr)
if not faces:
    print("ERROR: No face detected")
    sys.exit(1)

face = faces[0]
kps = getattr(face, "kps", None)
print(f"  Landmarks shape: {kps.shape if kps is not None else 'None'}")

# Compute aligned crop and affine matrix
aligned = detector.get_aligned_face(original_bgr, face)
M = face_align.estimate_norm(kps, image_size=512)
print(f"  Aligned crop shape: {aligned.shape}")
print(f"  Affine matrix:\n{M}")

# =========================================================================
# Part 3: Approach A — Original repo (full-image inference)
# =========================================================================

print("\n" + "=" * 70)
print("PART 3: Approach A — Full-image inference (original repo)")
print("=" * 70)

input_size = (512, 512)
input_mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
input_std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

image_rgb = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2RGB)
image_resized = cv2.resize(image_rgb, input_size, interpolation=cv2.INTER_LINEAR)
tensor = image_resized.astype(np.float32) / 255.0
tensor = (tensor - input_mean) / input_std
tensor = np.transpose(tensor, (2, 0, 1))
input_batch = np.expand_dims(tensor, axis=0).astype(np.float32)

input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name
raw_full = session.run([output_name], {input_name: input_batch})[0]

mask_full = raw_full.squeeze(0).argmax(0).astype(np.uint8)
print(f"  Mask shape: {mask_full.shape}")
print(f"  Mask unique classes: {sorted(np.unique(mask_full).tolist())}")

full_classes = sorted(np.unique(mask_full).tolist())
for c in full_classes:
    count = int((mask_full == c).sum())
    pct = 100 * count / mask_full.size
    print(f"    Class {c:2d}: {count:>8d} px ({pct:>5.2f}%)")

# =========================================================================
# Part 4: Approach B — Aligned-crop inference (old method)
# =========================================================================

print("\n" + "=" * 70)
print("PART 4: Approach B — Aligned-crop inference (OLD method)")
print("=" * 70)

aligned_rgb = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)
aligned_resized = cv2.resize(aligned_rgb, input_size, interpolation=cv2.INTER_LINEAR)
tensor_b = aligned_resized.astype(np.float32) / 255.0
tensor_b = (tensor_b - input_mean) / input_std
tensor_b = np.transpose(tensor_b, (2, 0, 1))
input_batch_b = np.expand_dims(tensor_b, axis=0).astype(np.float32)

raw_aligned = session.run([output_name], {input_name: input_batch_b})[0]
mask_aligned = raw_aligned.squeeze(0).argmax(0).astype(np.uint8)
print(f"  Mask shape: {mask_aligned.shape}")
print(f"  Mask unique classes: {sorted(np.unique(mask_aligned).tolist())}")

aligned_classes = sorted(np.unique(mask_aligned).tolist())
for c in aligned_classes:
    count = int((mask_aligned == c).sum())
    pct = 100 * count / mask_aligned.size
    print(f"    Class {c:2d}: {count:>8d} px ({pct:>5.2f}%)")

# =========================================================================
# Part 5: Approach C — Full image + warp to aligned space (NEW method)
# =========================================================================

print("\n" + "=" * 70)
print("PART 5: Approach C — Full image + warp to aligned space (NEW method)")
print("=" * 70)

# Run provider on full image → mask at original size
from app.providers.faceparsing_provider import FaceParsingProvider

provider = FaceParsingProvider()
mask_full_size = provider.predict(original_bgr)
print(f"  Full-size mask shape: {mask_full_size.shape}")

# Warp to aligned-face space
mask_warped = cv2.warpAffine(
    mask_full_size,
    M,
    (512, 512),
    flags=cv2.INTER_NEAREST,
    borderMode=cv2.BORDER_CONSTANT,
    borderValue=0,
)
print(f"  Warped mask shape: {mask_warped.shape}")
print(f"  Mask unique classes: {sorted(np.unique(mask_warped).tolist())}")

warped_classes = sorted(np.unique(mask_warped).tolist())
for c in warped_classes:
    count = int((mask_warped == c).sum())
    pct = 100 * count / mask_warped.size
    print(f"    Class {c:2d}: {count:>8d} px ({pct:>5.2f}%)")

# =========================================================================
# Part 6: Comparison
# =========================================================================

print("\n" + "=" * 70)
print("PART 6: Comparison")
print("=" * 70)

# Compare A (full image) vs C (warped from full image)
# They should be nearly identical (only difference is the warp interpolation)
print("\n--- Full-image mask vs Warped-to-aligned mask (A vs C) ---")
# Resize mask_full to match mask_full_size at full-image shape, then warp
mask_full_resized = cv2.resize(mask_full, (mask_full_size.shape[1], mask_full_size.shape[0]),
                                interpolation=cv2.INTER_NEAREST)
mask_full_warped = cv2.warpAffine(
    mask_full_resized, M, (512, 512),
    flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0,
)
identical_ac = np.array_equal(mask_full_warped, mask_warped)
print(f"Masks A→warped vs C identical: {identical_ac}")

# Compare B (aligned crop) vs C (warped from full)
print("\n--- Aligned-crop mask vs Warped-from-full mask (B vs C) ---")
identical_bc = np.array_equal(mask_aligned, mask_warped)
print(f"Masks identical: {identical_bc}")

if not identical_bc:
    diff_bc = int((mask_aligned != mask_warped).sum())
    diff_bc_pct = 100 * diff_bc / mask_aligned.size
    print(f"Different pixels: {diff_bc} ({diff_bc_pct:.2f}%)")

    print(f"\n{'Class':<8s} {'Aligned px':>10s} {'Full→warp px':>10s} {'Match':>10s}")
    print("-" * 48)
    all_classes = sorted(set(aligned_classes) | set(warped_classes))
    for c in all_classes:
        aligned_px = int((mask_aligned == c).sum())
        warped_px = int((mask_warped == c).sum())
        match = int(((mask_aligned == c) & (mask_warped == c)).sum())
        print(f"{c:<8d} {aligned_px:>10d} {warped_px:>10d} {match:>10d}")

# =========================================================================
# Part 7: Channel-wise analysis
# =========================================================================

print("\n" + "=" * 70)
print("PART 7: Channel-wise analysis")
print("=" * 70)

all_output_names = [o.name for o in session.get_outputs()]
print(f"All output names: {all_output_names}")

all_outputs = session.run(all_output_names, {input_name: input_batch})
for name, out in zip(all_output_names, all_outputs):
    print(f"  Output '{name}': shape={out.shape}, min={out.min():.4f}, max={out.max():.4f}")

main_out = all_outputs[0].squeeze(0)
for c in range(main_out.shape[0]):
    channel = main_out[c]
    print(f"  Channel {c:2d}: min={channel.min():.4f}, max={channel.max():.4f}, mean={channel.mean():.4f}")

# =========================================================================
# Part 8: Save visualizations
# =========================================================================

print("\n" + "=" * 70)
print("PART 8: Saving visualizations")
print("=" * 70)

cv2.imwrite(str(OUTPUT_DIR / "01_input_full.jpg"), original_bgr)
cv2.imwrite(str(OUTPUT_DIR / "02_input_aligned.jpg"), aligned)
cv2.imwrite(str(OUTPUT_DIR / "03_mask_full_512.png"), colorize(mask_full))
cv2.imwrite(str(OUTPUT_DIR / "04_mask_aligned_crop.png"), colorize(mask_aligned))
cv2.imwrite(str(OUTPUT_DIR / "05_mask_full_warped.png"), colorize(mask_warped))

# Difference: aligned crop vs warped-from-full
diff = np.full((512, 512, 3), 128, dtype=np.uint8)
diff[mask_aligned == mask_warped] = (0, 180, 0)
diff[mask_aligned != mask_warped] = (0, 0, 200)
cv2.imwrite(str(OUTPUT_DIR / "06_diff_aligned_vs_warped.png"), diff)

# Side-by-side
side = np.hstack([
    cv2.resize(aligned, (512, 512)),
    colorize(mask_aligned),
    colorize(mask_warped),
])
cv2.imwrite(str(OUTPUT_DIR / "07_side_by_side.png"), side)

print(f"  All outputs saved to {OUTPUT_DIR}/")
print("\nAudit complete.")
