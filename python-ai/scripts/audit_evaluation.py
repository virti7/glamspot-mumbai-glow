#!/usr/bin/env python3
"""Audit the parsing evaluation pipeline step by step.

Traces: GT loading → composition → warp → metrics computation
and identifies why pixel accuracy is 21.88% / mIoU 2.43%.

Generates per-step visualizations and pixel statistics for a
single image, then optionally runs the aggregate metrics to
confirm the root cause.

Usage:
    python scripts/audit_evaluation.py [--image 18] [--full]
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from insightface.utils import face_align

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.config.face_detection import FaceDetectionConfig
from app.services.pipeline_service import PipelineService, decode_mask_compact
from app.utils.parsing_metrics import compute_metrics, aggregate_metrics
from app.services.parsing_service import _CLASS_MAP

OUTPUT_DIR = Path("audit_evaluation")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")

_MASK_SUFFIX_TO_CLASS: dict[str, int] = {
    "skin": 1, "l_brow": 2, "r_brow": 3, "l_eye": 4, "r_eye": 5,
    "eye_g": 6, "l_ear": 7, "r_ear": 8, "ear_r": 9, "nose": 10,
    "mouth": 11, "u_lip": 12, "l_lip": 13, "neck": 14, "neck_l": 15,
    "cloth": 16, "hair": 17, "hat": 18,
}

_CLASS_NAMES = [
    "background", "skin", "l_brow", "r_brow", "l_eye",
    "r_eye", "eye_g", "l_ear", "r_ear", "ear_r",
    "nose", "mouth", "u_lip", "l_lip", "neck",
    "neck_l", "cloth", "hair", "hat",
]

_NUM_CLASSES = 19

_CLASS_COLORS: list[tuple[int, int, int]] = [
    (0, 0, 0), (255, 182, 193), (0, 0, 255), (0, 128, 255),
    (255, 255, 0), (128, 255, 0), (255, 0, 0), (192, 192, 192),
    (128, 128, 192), (255, 0, 255), (0, 165, 255), (0, 0, 128),
    (0, 0, 255), (0, 0, 200), (255, 255, 255), (128, 0, 128),
    (128, 128, 128), (0, 255, 0), (0, 128, 128),
]

_CELEBA_HQ_MERGE_ORDER: list[int] = [
    1, 16, 14, 15, 9, 18, 17, 13, 12, 11, 8, 7, 3, 2, 5, 4, 6, 10,
]


def _get_mask_subdir(image_id: int) -> str:
    return str(image_id // 2000)


def _colorize(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(_CLASS_COLORS):
        color[mask == cls_idx] = bgr
    return color


def _class_distribution(mask: np.ndarray, label: str) -> dict[int, int]:
    """Return {class_idx: count} for non-zero classes."""
    counts = {}
    for c in range(_NUM_CLASSES):
        n = int((mask == c).sum())
        if n > 0:
            counts[c] = n
    total = mask.size
    print(f"\n  [{label}] shape={mask.shape} total_px={total}")
    for c, n in sorted(counts.items()):
        name = _CLASS_NAMES[c] if c < _NUM_CLASSES else "?"
        print(f"    class {c:>2d} ({name:<20s}): {n:>8d} px ({100*n/total:>5.2f}%)")
    return counts


def _load_gt_masks_debug(image_id: int, quiet: bool = False) -> np.ndarray:
    """Load and composite CelebAMask-HQ GT masks at 1024×1024."""
    mask_dir = CELEBA_SRC / "CelebAMask-HQ-mask-anno" / _get_mask_subdir(image_id)
    pattern = f"{image_id:05d}_*.png"
    mask_paths = sorted(mask_dir.glob(pattern)) if mask_dir.is_dir() else []

    if not mask_paths:
        if not quiet:
            print(f"  ERROR: No mask files found for image {image_id} in {mask_dir}")
        return np.zeros((1024, 1024), dtype=np.uint8)

    if not quiet:
        print(f"\n  Found {len(mask_paths)} mask files:")

    class_to_path: dict[int, Path] = {}
    for mp in mask_paths:
        stem = mp.stem
        suffix = stem.split("_", 1)[1]
        class_idx = _MASK_SUFFIX_TO_CLASS.get(suffix)
        if class_idx is not None:
            class_to_path[class_idx] = mp
            if not quiet:
                print(f"    {mp.name} → class {class_idx} ({_CLASS_NAMES[class_idx]})")
        else:
            if not quiet:
                print(f"    {mp.name} → UNKNOWN SUFFIX '{suffix}' — SKIPPED")

    combined = np.zeros((1024, 1024), dtype=np.uint8)
    for step_idx, class_idx in enumerate(_CELEBA_HQ_MERGE_ORDER, 1):
        mp = class_to_path.get(class_idx)
        if mp is None:
            if not quiet:
                print(f"    Step {step_idx:>2d}: skipping class {class_idx} ({_CLASS_NAMES[class_idx]}) — no mask file")
            continue
        mask = cv2.imread(str(mp), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            continue
        if mask.shape != (1024, 1024):
            mask = cv2.resize(mask, (1024, 1024), interpolation=cv2.INTER_NEAREST)
        prev_fg = int((combined > 0).sum())
        combined[mask > 127] = class_idx
        new_fg = int((combined > 0).sum())
        if not quiet:
            class_px = int((combined == class_idx).sum())
            print(f"    Step {step_idx:>2d}: class {class_idx:>2d} ({_CLASS_NAMES[class_idx]:<12s}) → {class_px:>8d} px  (fg: {prev_fg:>8d} → {new_fg:>8d})")

    return combined


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit parsing evaluation pipeline")
    parser.add_argument("--image", type=int, default=18, help="Image ID to audit")
    parser.add_argument("--full", action="store_true", help="Run full aggregate metrics check")
    args = parser.parse_args()

    image_id = args.image
    print("=" * 70)
    print(f"  PARSING EVALUATION AUDIT — Image {image_id}")
    print("=" * 70)

    # ──────────────────────────────────────────────
    # STEP 1: Get aligned face + prediction mask
    # ──────────────────────────────────────────────
    print("\n── STEP 1: Pipeline inference ──")

    benchmark_img = BENCHMARK_DIR / "images" / f"{image_id}.jpg"
    if not benchmark_img.is_file():
        print(f"ERROR: {benchmark_img} not found")
        sys.exit(1)

    pipe = PipelineService(face_config=FaceDetectionConfig.PRESET_AGGRESSIVE)
    result = pipe.analyze_from_file(str(benchmark_img))
    if result.get("status") != "success":
        print(f"Pipeline failed: {result.get('error')}")
        sys.exit(1)

    pred_mask = decode_mask_compact(result["parsing_mask_encoded"])
    print(f"\n  Prediction mask:  {pred_mask.shape}, dtype={pred_mask.dtype}")
    print(f"  Unique values:    {sorted(np.unique(pred_mask).tolist())}")
    pred_counts = _class_distribution(pred_mask, "Prediction")

    # Save pred visualization
    cv2.imwrite(str(OUTPUT_DIR / f"step1_pred_{image_id}.png"), pred_mask)
    cv2.imwrite(str(OUTPUT_DIR / f"step1_pred_color_{image_id}.png"),
                _colorize(pred_mask))

    # ──────────────────────────────────────────────
    # STEP 2: Load GT masks and composite
    # ──────────────────────────────────────────────
    print("\n── STEP 2: Load CelebAMask-HQ GT masks ──")

    gt_full = _load_gt_masks_debug(image_id)
    print(f"\n  GT composite shape: {gt_full.shape}, dtype={gt_full.dtype}")
    print(f"  Unique values:      {sorted(np.unique(gt_full).tolist())}")
    gt_full_counts = _class_distribution(gt_full, "GT 1024×1024")

    cv2.imwrite(str(OUTPUT_DIR / f"step2_gt_full_{image_id}.png"), gt_full)
    cv2.imwrite(str(OUTPUT_DIR / f"step2_gt_full_color_{image_id}.png"),
                _colorize(gt_full))

    # ──────────────────────────────────────────────
    # STEP 3: Get affine matrix from pipeline
    # ──────────────────────────────────────────────
    print("\n── STEP 3: Affine matrix ──")

    affine_matrix = result.get("affine_matrix")
    face_kps = result.get("face_alignment_keypoints")
    print(f"  affine_matrix: {affine_matrix is not None}")
    print(f"  face_kps:      {face_kps is not None}")

    if affine_matrix is None and face_kps is not None:
        kps_np = np.array(face_kps, dtype=np.float64)
        _est = face_align.estimate_norm(kps_np, image_size=512)
        M = _est[0] if isinstance(_est, tuple) else _est
    elif affine_matrix is not None:
        M = np.array(affine_matrix, dtype=np.float64)
    else:
        print("ERROR: No affine matrix or keypoints available")
        sys.exit(1)

    print(f"  Affine matrix M:\n{M}")

    crop_h, crop_w = pred_mask.shape

    # ──────────────────────────────────────────────
    # STEP 4: Warp GT with INTER_LINEAR + round (current eval code)
    # ──────────────────────────────────────────────
    print("\n── STEP 4: Warp GT with INTER_LINEAR + round (AS EVAL CODE) ──")

    gt_aligned_current = cv2.warpAffine(
        gt_full.astype(np.float32), M, (crop_w, crop_h),
        flags=cv2.INTER_LINEAR, borderValue=0.0,
    )
    gt_aligned_current = np.round(gt_aligned_current).astype(np.uint8)

    print(f"  GT aligned shape: {gt_aligned_current.shape}")
    print(f"  Unique values:    {sorted(np.unique(gt_aligned_current).tolist())}")
    gt_current_counts = _class_distribution(gt_aligned_current, "GT aligned (INTER_LINEAR + round)")

    cv2.imwrite(str(OUTPUT_DIR / f"step4_gt_linear_{image_id}.png"), gt_aligned_current)
    cv2.imwrite(str(OUTPUT_DIR / f"step4_gt_linear_color_{image_id}.png"),
                _colorize(gt_aligned_current))

    # ──────────────────────────────────────────────
    # STEP 5: Warp GT with INTER_NEAREST (correct approach)
    # ──────────────────────────────────────────────
    print("\n── STEP 5: Warp GT with INTER_NEAREST (correct approach) ──")

    gt_aligned_nearest = cv2.warpAffine(
        gt_full, M, (crop_w, crop_h),
        flags=cv2.INTER_NEAREST, borderValue=0,
    )

    print(f"  GT aligned shape: {gt_aligned_nearest.shape}")
    print(f"  Unique values:    {sorted(np.unique(gt_aligned_nearest).tolist())}")
    gt_nearest_counts = _class_distribution(gt_aligned_nearest, "GT aligned (INTER_NEAREST)")

    cv2.imwrite(str(OUTPUT_DIR / f"step5_gt_nearest_{image_id}.png"), gt_aligned_nearest)
    cv2.imwrite(str(OUTPUT_DIR / f"step5_gt_nearest_color_{image_id}.png"),
                _colorize(gt_aligned_nearest))

    # ──────────────────────────────────────────────
    # STEP 6: Compare aligned GT variants vs pred
    # ──────────────────────────────────────────────
    print("\n── STEP 6: Metrics comparison ──")
    print("  A) Prediction vs GT (INTER_LINEAR + round) — AS CURRENT EVAL CODE")
    metrics_current = compute_metrics(pred_mask, gt_aligned_current, num_classes=_NUM_CLASSES)
    print(f"     Pixel Acc: {metrics_current['pixel_acc']*100:.2f}%")
    print(f"     Mean IoU:  {metrics_current['mean_iou']*100:.2f}%")
    print(f"     FW-IoU:    {metrics_current['fw_iou']*100:.2f}%")

    per_class = metrics_current["per_class"]
    print("     Per-class IoU:")
    for i in range(_NUM_CLASSES):
        name = _CLASS_NAMES[i]
        iou_v = float(per_class["iou"][i]) * 100
        if per_class["support"][i] > 0:
            print(f"       {i:>2d} ({name:<20s}): IoU={iou_v:>5.1f}%  support={per_class['support'][i]:>8d}")
        else:
            print(f"       {i:>2d} ({name:<20s}): IoU={iou_v:>5.1f}%  support= —")

    print("\n  B) Prediction vs GT (INTER_NEAREST) — CORRECTED")
    metrics_nearest = compute_metrics(pred_mask, gt_aligned_nearest, num_classes=_NUM_CLASSES)
    print(f"     Pixel Acc: {metrics_nearest['pixel_acc']*100:.2f}%")
    print(f"     Mean IoU:  {metrics_nearest['mean_iou']*100:.2f}%")
    print(f"     FW-IoU:    {metrics_nearest['fw_iou']*100:.2f}%")

    per_class_n = metrics_nearest["per_class"]
    print("     Per-class IoU:")
    for i in range(_NUM_CLASSES):
        name = _CLASS_NAMES[i]
        iou_v = float(per_class_n["iou"][i]) * 100
        if per_class_n["support"][i] > 0:
            print(f"       {i:>2d} ({name:<20s}): IoU={iou_v:>5.1f}%  support={per_class_n['support'][i]:>8d}")
        else:
            print(f"       {i:>2d} ({name:<20s}): IoU={iou_v:>5.1f}%  support= —")

    # ──────────────────────────────────────────────
    # STEP 7: Find exactly which pixels differ
    # ──────────────────────────────────────────────
    print("\n── STEP 7: Diagnostic — class values corrupted by INTER_LINEAR ──")

    # Compare the two GT alignments
    linear_vs_nearest = gt_aligned_current != gt_aligned_nearest
    n_corrupted = int(linear_vs_nearest.sum())
    print(f"  Pixels where INTER_LINEAR + round ≠ INTER_NEAREST: {n_corrupted} / {gt_aligned_current.size} ({100*n_corrupted/gt_aligned_current.size:.2f}%)")

    if n_corrupted > 0:
        # What values did they become?
        print("\n  Class transition analysis (gt_aligned_linear vs gt_aligned_nearest):")
        for c in range(_NUM_CLASSES):
            c_in_nearest = (gt_aligned_nearest == c)
            if c_in_nearest.any():
                c_in_linear = gt_aligned_current[c_in_nearest]
                if c_in_linear.size > 0:
                    unique_linear = np.unique(c_in_linear)
                    bad = [v for v in unique_linear if v != c]
                    if bad:
                        bincount = np.bincount(c_in_linear.astype(np.intp), minlength=_NUM_CLASSES)
                        for b in bad:
                            n_mis = int(bincount[b])
                            print(f"    Class {c:>2d} ({_CLASS_NAMES[c]:<12s}) → {b:>2d} ({_CLASS_NAMES[b]:<12s}): {n_mis:>8d} px  ({100*n_mis/gt_aligned_current.size:.2f}%)")

    # Also check: what's the direct pred vs each GT
    print("\n  Direct class distribution comparison:")
    for c in range(_NUM_CLASSES):
        pred_c = int((pred_mask == c).sum())
        gt_linear_c = int((gt_aligned_current == c).sum())
        gt_nearest_c = int((gt_aligned_nearest == c).sum())
        if pred_c > 0 or gt_linear_c > 0 or gt_nearest_c > 0:
            print(f"    Class {c:>2d} ({_CLASS_NAMES[c]:<12s}):  pred={pred_c:>8d}  gt_linear={gt_linear_c:>8d}  gt_nearest={gt_nearest_c:>8d}")

    # ──────────────────────────────────────────────
    # STEP 8: Also check — is the GT mask in ALIGNED FACE SPACE correct?
    # ──────────────────────────────────────────────
    print("\n── STEP 8: Prediction vs aligned face overlay ──")

    aligned_face = pipe._face._provider.get_aligned_face(
        cv2.imread(str(benchmark_img)),
        pipe._face._provider.detect(cv2.imread(str(benchmark_img)))[0],
    ) if hasattr(pipe, '_face') else None

    if aligned_face is not None:
        print(f"  Aligned face shape: {aligned_face.shape}")
        h, w = aligned_face.shape[:2]

        # Colorize and overlay prediction on aligned face
        pred_color = cv2.resize(
            _colorize(pred_mask), (w, h), interpolation=cv2.INTER_NEAREST
        )
        overlay_pred = cv2.addWeighted(aligned_face, 0.6, pred_color, 0.4, 0)

        gt_color = cv2.resize(
            _colorize(gt_aligned_nearest), (w, h), interpolation=cv2.INTER_NEAREST
        )
        overlay_gt = cv2.addWeighted(aligned_face, 0.6, gt_color, 0.4, 0)

        comparison = np.vstack([overlay_pred, overlay_gt])
        cv2.imwrite(str(OUTPUT_DIR / f"step8_overlay_{image_id}.png"), comparison)
        print("  Saved: step8_overlay.png  (top=prediction, bottom=GT)")

        # Also save diff overlay
        diff = np.full((h, w, 3), 128, dtype=np.uint8)
        correct = pred_mask == gt_aligned_nearest
        diff[correct] = (0, 180, 0)  # green
        diff[~correct] = (0, 0, 200)  # red
        diff_resized = cv2.resize(diff, (w, h), interpolation=cv2.INTER_NEAREST)
        cv2.imwrite(str(OUTPUT_DIR / f"step8_diff_{image_id}.png"), diff_resized)
        print("  Saved: step8_diff.png  (green=correct, red=error)")

    # ──────────────────────────────────────────────
    # OPTIONAL: Full aggregate check
    # ──────────────────────────────────────────────
    if args.full:
        print("\n── FULL AGGREGATE CHECK ──")
        gt_csv = BENCHMARK_DIR / "ground_truth.csv"
        mask_dir = BENCHMARK_DIR / "masks"

        with open(gt_csv, newline="", encoding="utf-8") as f:
            images = list(csv.DictReader(f))

        results = []
        for entry in images[:50]:  # limit for speed
            fn = entry["filename"]
            img_path = BENCHMARK_DIR / "images" / fn
            if not img_path.exists():
                continue
            try:
                r = pipe.analyze_from_file(str(img_path))
                if r.get("status") != "success":
                    continue
                pred = decode_mask_compact(r["parsing_mask_encoded"])
                h_pred, w_pred = pred.shape
                img_id = int(Path(fn).stem)

                gt_full_i = _load_gt_masks_debug(img_id, quiet=True)

                aff = r.get("affine_matrix")
                if aff is not None:
                    M_i = np.array(aff, dtype=np.float64)
                else:
                    kps = r.get("face_alignment_keypoints")
                    if kps is None:
                        continue
                    kps_np = np.array(kps, dtype=np.float64)
                    _est = face_align.estimate_norm(kps_np, image_size=512)
                    M_i = _est[0] if isinstance(_est, tuple) else _est

                # Warp with INTER_NEAREST (correct)
                gt_aligned_i = cv2.warpAffine(
                    gt_full_i, M_i, (w_pred, h_pred),
                    flags=cv2.INTER_NEAREST, borderValue=0,
                )

                results.append({
                    "cm": compute_metrics(pred, gt_aligned_i, num_classes=_NUM_CLASSES)["cm"],
                })
            except Exception as e:
                print(f"  Skipped {fn}: {e}")

        if results:
            global_metrics = aggregate_metrics(results)
            print(f"  Images:     {len(results)}")
            print(f"  Pixel Acc:  {global_metrics['pixel_acc']*100:.2f}%")
            print(f"  Mean IoU:   {global_metrics['mean_iou']*100:.2f}%")
            print(f"  FW-IoU:     {global_metrics['fw_iou']*100:.2f}%")
            per_class = global_metrics["per_class"]
            for i in range(_NUM_CLASSES):
                name = _CLASS_NAMES[i]
                iou_v = float(per_class["iou"][i]) * 100
                if per_class["support"][i] > 0:
                    print(f"    {i:>2d} ({name:<20s}): IoU={iou_v:>5.1f}%  support={per_class['support'][i]:>8d}")

    print(f"\nAll outputs saved to: {OUTPUT_DIR.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()
