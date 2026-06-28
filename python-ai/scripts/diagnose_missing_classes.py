#!/usr/bin/env python3
"""Diagnose why the BiSeNet model never predicts certain classes.

For each class (0–18) reports:
  - Maximum logit value
  - Mean logit value
  - % of pixels where it wins argmax

Tests three inference paths:
  A. Direct ONNX at 512×512 model-native resolution (no resize)
  B. Provider predict() on full image (includes 512→1024→512 resize chain)
  C. Provider predict() on aligned face crop

Compares raw logits at each stage to isolate where classes are lost.
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
from app.providers.insightface_provider import InsightFaceProvider

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")

ATTRIBUTES = [
    "background", "skin", "l_brow", "r_brow", "l_eye", "r_eye",
    "eye_g", "l_ear", "r_ear", "ear_r", "nose", "mouth",
    "u_lip", "l_lip", "neck", "neck_l", "cloth", "hair", "hat",
]

_NUM_CLASSES = 19


def per_class_report(logits: np.ndarray, label: str) -> list[str]:
    """Compute per-class stats from raw logits (C, H, W)."""
    mask = np.argmax(logits, axis=0).astype(np.uint8)
    total_px = mask.size
    lines = []
    lines.append(f"\n{'='*70}")
    lines.append(f"  {label}")
    lines.append(f"  Argmax shape: {mask.shape}  ({total_px} px)")
    unique_classes = sorted(np.unique(mask).tolist())
    lines.append(f"  Classes in argmax: {unique_classes}")
    lines.append(f"{'='*70}")
    lines.append(
        f"{'Ch':>3} {'Class':<12} {'MaxLogit':>10} {'MeanLogit':>10} "
        f"{'WinPct':>8} {'WinPx':>8}"
    )
    lines.append("-" * 60)
    for c in range(_NUM_CLASSES):
        ch = logits[c]
        win_px = int((mask == c).sum())
        win_pct = 100 * win_px / total_px
        lines.append(
            f"{c:>3} {ATTRIBUTES[c]:<12} {ch.max():>10.4f} {ch.mean():>10.4f} "
            f"{win_pct:>7.2f}% {win_px:>8}"
        )
    lines.append("-" * 60)
    missing = [c for c in range(_NUM_CLASSES) if c not in unique_classes]
    lines.append(f"  Classes NEVER predicted: {missing}")
    for c in missing:
        lines.append(f"    {c:>3} ({ATTRIBUTES[c]:<12}) — max_logit={logits[c].max():.4f}")
    return lines


def compare_masks(m1: np.ndarray, m2: np.ndarray, label1: str, label2: str) -> list[str]:
    """Compare two class-index masks."""
    lines = []
    lines.append(f"\n  --- {label1} vs {label2} ---")
    if m1.shape != m2.shape:
        lines.append(f"  Shape mismatch: {m1.shape} vs {m2.shape}")
        return lines
    same = (m1 == m2).sum()
    total = m1.size
    lines.append(f"  Agreement: {same}/{total} ({100*same/total:.2f}%)")
    for c in range(_NUM_CLASSES):
        in1 = int((m1 == c).sum())
        in2 = int((m2 == c).sum())
        if in1 != in2:
            lines.append(f"    Class {c:>2} ({ATTRIBUTES[c]:<12}): {label1}={in1:>8}px  {label2}={in2:>8}px")
    return lines


def main() -> None:
    # ── Load test image ──
    image_id = 18
    filename = f"{image_id}.jpg"
    img_path = BENCHMARK_DIR / "images" / filename
    if not img_path.is_file():
        img_path = CELEBA_SRC / "CelebA-HQ-img" / filename
    original_bgr = cv2.imread(str(img_path))
    if original_bgr is None:
        print(f"ERROR: Cannot read {img_path}")
        sys.exit(1)
    print(f"Image: {img_path}")
    print(f"Original shape: {original_bgr.shape}")

    # ── Get aligned face and affine matrix ──
    pipe = PipelineService(face_config=FaceDetectionConfig.PRESET_AGGRESSIVE)
    result = pipe.analyze_from_file(str(img_path))
    affine_matrix = result.get("affine_matrix")
    face_kps = result.get("face_alignment_keypoints")
    print(f"Affine matrix: {affine_matrix is not None}")
    print(f"Face kps: {face_kps is not None}")

    # Aligned face
    detector = InsightFaceProvider()
    detector.configure(det_size=(640, 640), det_thresh=0.5)
    faces = detector.detect(original_bgr)
    largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    aligned_face = detector.get_aligned_face(original_bgr, largest)
    aligned_kps = getattr(largest, 'kps', None)
    print(f"Aligned face shape: {aligned_face.shape}")

    # ========================================================================
    # PATH A: Direct ONNX at 512×512 model-native resolution
    # ========================================================================
    print("\n" + "="*70)
    print("PATH A: Direct ONNX at 512×512 (model-native)")
    print("="*70)

    import onnxruntime as ort
    model_path = _PROJECT_ROOT / "app" / "assets" / "models" / "face_parsing.onnx"
    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    _MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    _STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def preprocess(img_bgr: np.ndarray, target_size: int = 512) -> np.ndarray:
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
        tensor = resized.astype(np.float32) / 255.0
        tensor = (tensor - _MEAN) / _STD
        tensor = tensor.transpose(2, 0, 1)
        tensor = np.expand_dims(tensor, axis=0)
        return tensor

    # A1: Full image at 512×512
    tensor_full = preprocess(original_bgr)
    raw_full = session.run([output_name], {input_name: tensor_full})[0]
    logits_full_512 = raw_full.squeeze(0)  # (19, 512, 512)

    lines_a1 = per_class_report(logits_full_512, "PATH A1: Full image → ONNX at 512×512")
    for l in lines_a1:
        print(l)

    # A2: Aligned face at 512×512
    if aligned_face.shape[:2] != (512, 512):
        aligned_512 = cv2.resize(aligned_face, (512, 512), interpolation=cv2.INTER_LINEAR)
    else:
        aligned_512 = aligned_face
    tensor_aligned = preprocess(aligned_512)
    raw_aligned = session.run([output_name], {input_name: tensor_aligned})[0]
    logits_aligned_512 = raw_aligned.squeeze(0)

    lines_a2 = per_class_report(logits_aligned_512, "PATH A2: Aligned face → ONNX at 512×512")
    for l in lines_a2:
        print(l)

    # ========================================================================
    # Compare A1 vs A2 argmax
    # ========================================================================
    mask_full_512 = np.argmax(logits_full_512, axis=0).astype(np.uint8)
    mask_aligned_512 = np.argmax(logits_aligned_512, axis=0).astype(np.uint8)
    for l in compare_masks(mask_full_512, mask_aligned_512, "Full-512", "Aligned-512"):
        print(l)

    # ========================================================================
    # PATH B: Provider predict() on full image (the actual pipeline path)
    # ========================================================================
    print("\n" + "="*70)
    print("PATH B: Provider predict() on full image (production path)")
    print("="*70)

    provider = FaceParsingProvider()
    mask_full_provider = provider.predict(original_bgr)  # Returns 1024×1024
    print(f"Provider full mask shape: {mask_full_provider.shape}")
    unique_b = sorted(np.unique(mask_full_provider).tolist())
    print(f"Classes after provider: {unique_b}")

    # Compare with A1 argmax at 512×512
    # A1 mask is 512×512. We need to resize to 1024×1024 for comparison
    mask_full_512_resized = cv2.resize(mask_full_512, (1024, 1024), interpolation=cv2.INTER_NEAREST)
    for l in compare_masks(mask_full_512_resized, mask_full_provider, "A1-512→1024", "Provider-full"):
        print(l)

    # ========================================================================
    # PATH C: Full pipeline mask (affine warped to aligned space)
    # ========================================================================
    print("\n" + "="*70)
    print("PATH C: Pipeline mask (full image → warp to aligned space)")
    print("="*70)

    pipeline_mask = decode_mask_compact(result["parsing_mask_encoded"])
    print(f"Pipeline mask shape: {pipeline_mask.shape}")
    unique_c = sorted(np.unique(pipeline_mask).tolist())
    print(f"Classes in pipeline mask: {unique_c}")

    # Compare B vs C: warp B to aligned space
    if affine_matrix is not None:
        M = np.array(affine_matrix, dtype=np.float64)
        mask_full_1024 = mask_full_provider  # already 1024×1024
        mask_warped = cv2.warpAffine(
            mask_full_1024.astype(np.uint8), M, (512, 512),
            flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0,
        )
        print(f"Provider→warped shape: {mask_warped.shape}")
        unique_warped = sorted(np.unique(mask_warped).tolist())
        print(f"Classes after warp: {unique_warped}")

        for l in compare_masks(mask_warped, pipeline_mask, "B→warp", "Pipeline"):
            print(l)

    # ========================================================================
    # Compare A1 vs A2 logits directly (is the aligned crop preprocessing different?)
    # ========================================================================
    print("\n" + "="*70)
    print("LOGIT COMPARISON: Full image inference vs Aligned crop inference")
    print("="*70)
    print(f"\n{'Class':<12} {'Full-max':>10} {'Full-mean':>10} {'Al-max':>10} {'Al-mean':>10} {'Diff-max':>10}")
    print("-" * 64)
    for c in range(_NUM_CLASSES):
        full_max = logits_full_512[c].max()
        full_mean = logits_full_512[c].mean()
        al_max = logits_aligned_512[c].max()
        al_mean = logits_aligned_512[c].mean()
        diff_max = full_max - al_max
        print(f"{ATTRIBUTES[c]:<12} {full_max:>10.4f} {full_mean:>10.4f} {al_max:>10.4f} {al_mean:>10.4f} {diff_max:>10.4f}")

    # ========================================================================
    # ANALYSIS: Per-class winning channel heatmap
    # ========================================================================
    print("\n" + "="*70)
    print("CLASS ACTIVATION ANALYSIS")
    print("="*70)
    print()
    print("For each class in ATTRIBUTES order:")
    print(f"{'Ch':>3} {'Class':<12} {'In A1?':>8} {'In A2?':>8} {'In B?':>8} {'In C?':>8}  Notes")
    print("-" * 70)

    a1_classes = set(np.unique(mask_full_512).tolist())
    a2_classes = set(np.unique(mask_aligned_512).tolist())
    b_classes = set(np.unique(mask_full_provider).tolist())
    c_classes = set(np.unique(pipeline_mask).tolist())

    for c in range(_NUM_CLASSES):
        in_a1 = "✓" if c in a1_classes else "✗"
        in_a2 = "✓" if c in a2_classes else "✗"
        in_b = "✓" if c in b_classes else "✗"
        in_c = "✓" if c in c_classes else "✗"

        notes = []
        if c not in a1_classes:
            max_logit = logits_full_512[c].max()
            notes.append(f"max_logit={max_logit:.4f}")
            if max_logit < 0:
                notes.append("NEGATIVE peak — never wins")

        note_str = "; ".join(notes) if notes else ""
        print(f"{c:>3} {ATTRIBUTES[c]:<12} {in_a1:>8} {in_a2:>8} {in_b:>8} {in_c:>8}  {note_str}")

    # ========================================================================
    # DIAGNOSIS
    # ========================================================================
    print("\n" + "="*70)
    print("DIAGNOSIS")
    print("="*70)

    # Check if missing classes are missing from model-native output (A1)
    model_missing = [c for c in range(_NUM_CLASSES) if c not in a1_classes]
    pipeline_missing = [c for c in range(_NUM_CLASSES) if c not in c_classes]
    lost_in_pipeline = [c for c in model_missing if c not in pipeline_missing]  # shouldn't happen
    gained_in_pipeline = [c for c in pipeline_missing if c not in model_missing]  # shouldn't happen

    print(f"\nClasses missing from MODEL output (A1): {model_missing}")
    print(f"Classes missing from PIPELINE output (C): {pipeline_missing}")

    if set(model_missing) == set(pipeline_missing):
        print("\n✅ MODEL AND PIPELINE AGREE: missing classes are absent from model output.")
        print("   → This is a model limitation, not a preprocessing bug.")
    else:
        only_model = set(model_missing) - set(pipeline_missing)
        only_pipeline = set(pipeline_missing) - set(model_missing)
        if only_model:
            print(f"\n⚠ Classes in model output but lost in pipeline: {only_model}")
            print("   → POST-PROCESSING is destroying these classes!")
        if only_pipeline:
            print(f"\n⚠ Classes NOT in model output but present in pipeline: {only_pipeline}")
            print("   → This shouldn't happen — check for bugs.")

    # Check if missing classes have positive max logit
    suppressed = []
    for c in model_missing:
        max_l = logits_full_512[c].max()
        if max_l > 0:
            suppressed.append(c)
    if suppressed:
        print(f"\n⚠ Classes with POSITIVE max logit but never winning argmax: {suppressed}")
        for c in suppressed:
            ch = logits_full_512[c]
            print(f"    {c:>2} ({ATTRIBUTES[c]:<12}): max={ch.max():.4f}, mean={ch.mean():.4f}, std={ch.std():.4f}")
            # Find which class wins where this class has highest activation
            winner_at_peak = np.argmax(logits_full_512[:, ch == ch.max()], axis=0)
            winner_counts = np.bincount(winner_at_peak.flatten().astype(np.intp), minlength=_NUM_CLASSES)
            top_winners = np.argsort(winner_counts)[-3:][::-1]
            print(f"           At peak locations of class {c}, winners are: {[(w, int(winner_counts[w])) for w in top_winners if winner_counts[w] > 0]}")
    else:
        print(f"\n✓ All missing classes have NEGATIVE max logit — model genuinely doesn't fire them.")


if __name__ == "__main__":
    main()
