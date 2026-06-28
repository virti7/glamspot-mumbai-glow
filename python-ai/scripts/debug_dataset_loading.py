#!/usr/bin/env python3
"""Debug dataset loading: verify mask file structure, naming, and availability.

Checks:
  1. ground_truth.csv entries for a given image
  2. Benchmark masks/ directory contents
  3. CelebAMask-HQ source mask directory structure
  4. Exact glob patterns and results
  5. Visual report with original, GT, prediction, overlay, diff
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import cv2
import numpy as np
from insightface.utils import face_align
from loguru import logger

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.config.face_detection import FaceDetectionConfig
from app.services.pipeline_service import PipelineService, decode_mask_compact
from app.utils.parsing_metrics import compute_metrics

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")

_MASK_SUFFIX_TO_CLASS: dict[str, int] = {
    "skin": 1, "l_brow": 2, "r_brow": 3, "l_eye": 4, "r_eye": 5,
    "eye_g": 6, "l_ear": 7, "r_ear": 8, "ear_r": 9, "nose": 10,
    "mouth": 11, "u_lip": 12, "l_lip": 13, "neck": 14, "neck_l": 15,
    "cloth": 16, "hair": 17, "hat": 18,
}

# CelebAMask-HQ official g_mask.py list2 order, REVERSED so small
# facial details overwrite larger enclosing regions.
# Official order: skin → l_brow → r_brow → l_eye → r_eye → eye_g →
#   l_ear → r_ear → ear_r → nose → mouth → u_lip → l_lip → neck →
#   neck_l → cloth → hair → hat
# Reference: https://github.com/switchablenorms/CelebAMask-HQ/
#            blob/master/face_parsing/Data_preprocessing/g_mask.py
_CELEBA_HQ_MERGE_ORDER: list[int] = [
    1,   # skin       – face base (overwritten by everything)
    16,  # cloth      – large enclosing region
    14,  # neck       – large enclosing region
    15,  # neck_l     – on neck / cloth
    9,   # ear_r      – on ear
    18,  # hat        – on top of head / hair
    17,  # hair       – around head
    13,  # l_lip      – lip detail
    12,  # u_lip      – lip detail
    11,  # mouth      – inner mouth
    8,   # r_ear      – ear
    7,   # l_ear      – ear
    3,   # r_brow     – eyebrow
    2,   # l_brow     – eyebrow
    5,   # r_eye      – eye
    4,   # l_eye      – eye
    6,   # eye_g      – glasses
    10,  # nose       – centre face
]

_CLASS_IDX_TO_NAME: dict[int, str] = {
    0: "background", 1: "skin", 2: "l_brow", 3: "r_brow",
    4: "l_eye", 5: "r_eye", 6: "eye_g", 7: "l_ear",
    8: "r_ear", 9: "ear_r", 10: "nose", 11: "mouth",
    12: "u_lip", 13: "l_lip", 14: "neck", 15: "neck_l",
    16: "cloth", 17: "hair", 18: "hat",
}

_NUM_CLASSES = 19

_CLASS_COLORS: list[tuple[int, int, int]] = [
    (0, 0, 0), (255, 182, 193), (0, 0, 255), (0, 128, 255),
    (255, 255, 0), (128, 255, 0), (255, 0, 0), (192, 192, 192),
    (128, 128, 192), (255, 0, 255), (0, 165, 255), (0, 0, 128),
    (0, 0, 255), (0, 0, 200), (255, 255, 255), (128, 0, 128),
    (128, 128, 128), (0, 255, 0), (0, 128, 128),
]


def _colorize_mask(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(_CLASS_COLORS):
        color[mask == cls_idx] = bgr
    return color


def _explore_source_structure(src_root: Path) -> None:
    """Explore the CelebAMask-HQ source mask directory structure."""
    mask_anno = src_root / "CelebAMask-HQ-mask-anno"
    if not mask_anno.is_dir():
        logger.warning("Source mask dir not found: {}", mask_anno)
        return

    logger.info("=== Source mask structure ===")
    subdirs = sorted(mask_anno.iterdir())
    logger.info("Number of subdirectories in source: {}", len(subdirs))
    for sd in subdirs[:5]:
        files = list(sd.glob("*.png"))
        logger.info("  {}/  -> {} mask files  (examples: {})",
                    sd.name, len(files),
                    [p.name for p in files[:3]])
    if len(subdirs) > 5:
        remaining = len(subdirs) - 5
        logger.info("  ... and {} more subdirectories", remaining)
        for sd in subdirs[-3:]:
            files = list(sd.glob("*.png"))
            logger.info("  {}/  -> {} mask files  (examples: {})",
                        sd.name, len(files),
                        [p.name for p in files[:3]])


def _check_benchmark_masks(benchmark_dir: Path, image_id: int) -> None:
    """Check benchmark masks directory for a specific image."""
    mask_dir = benchmark_dir / "masks"
    logger.info("\n=== Benchmark masks directory ===")

    if not mask_dir.is_dir():
        logger.error("Benchmark mask dir not found: {}", mask_dir)
        return

    all_mask_files = list(mask_dir.glob("*.png"))
    logger.info("Total mask files in benchmark: {}", len(all_mask_files))

    # Check by image ID ranges
    for prefix in ["0", "0", "1", "2", "10", "20", "29"]:
        sample = [p for p in all_mask_files if p.stem.startswith(prefix)]
        logger.info("  {}* files: {} (examples: {})", prefix, len(sample),
                    [p.name for p in sample[:3]])

    # Check specific image
    pattern = f"{image_id:05d}_*.png"
    found = list(mask_dir.glob(pattern))
    logger.info("\nPattern used: {}", pattern)
    logger.info("Masks found for image {}: {} items", image_id, len(found))
    for f in found:
        m = cv2.imread(str(f), cv2.IMREAD_GRAYSCALE)
        logger.info("  {} -> shape={}, dtype={}, unique={}",
                    f.name, m.shape if m is not None else "None",
                    m.dtype if m is not None else "N/A",
                    np.unique(m) if m is not None else "N/A")

    # Check ALL expected classes
    expected_classes = set(_MASK_SUFFIX_TO_CLASS.keys())
    found_suffixes = set()
    for f in found:
        suffix = f.stem.split("_", 1)[1]
        found_suffixes.add(suffix)
    missing = expected_classes - found_suffixes
    if missing:
        logger.warning("Missing mask parts for image {}: {}", image_id, missing)


def _explore_source_masks_for_id(src_root: Path, image_id: int) -> None:
    """Check what masks exist in source for a given image ID."""
    mask_anno = src_root / "CelebAMask-HQ-mask-anno"
    if not mask_anno.is_dir():
        return

    pattern = f"{image_id:05d}_*.png"

    # Try ALL subdirectories
    logger.info("\n=== Source mask search for image {} ===", image_id)
    for sd in sorted(mask_anno.iterdir()):
        found = list(sd.glob(pattern))
        if found:
            logger.info("  FOUND in subdir '{}': {} files", sd.name, len(found))
            for f in found[:5]:
                m = cv2.imread(str(f), cv2.IMREAD_GRAYSCALE)
                logger.info("    {} -> shape={}, dtype={}, unique={}",
                            f.name, m.shape if m is not None else "None",
                            m.dtype if m is not None else "N/A",
                            np.unique(m) if m is not None else "N/A")


def _get_mask_subdir(image_id: int) -> str:
    """CelebAMask-HQ stores masks in subdirs grouped by 2000 images."""
    return str(image_id // 2000)


def _load_gt_masks_fixed(mask_dir: Path, image_id: int) -> np.ndarray:
    """Load GT masks with proper upscaling to 1024x1024.

    Falls back to the CelebAMask-HQ source tree when the benchmark
    directory does not contain the required mask files.
    """
    pattern = f"{image_id:05d}_*.png"
    mask_paths: list[Path] = sorted(mask_dir.glob(pattern))

    # Fallback: try CelebAMask-HQ source with correct subdirectory
    if not mask_paths:
        src_mask_dir = CELEBA_SRC / "CelebAMask-HQ-mask-anno" / _get_mask_subdir(image_id)
        if src_mask_dir.is_dir():
            mask_paths = sorted(src_mask_dir.glob(pattern))

    if not mask_paths:
        logger.warning("No masks found for image {}", image_id)
        return np.zeros((1024, 1024), dtype=np.uint8)

    # Group discovered mask files by class index
    class_to_path: dict[int, Path] = {}
    for mp in mask_paths:
        stem = mp.stem
        suffix = stem.split("_", 1)[1]
        class_idx = _MASK_SUFFIX_TO_CLASS.get(suffix)
        if class_idx is None:
            continue
        class_to_path[class_idx] = mp

    # Composite using reversed CelebAMask-HQ z-order
    # (large regions first, small details last so details overwrite)
    order_name = {1:"skin",2:"l_brow",3:"r_brow",4:"l_eye",5:"r_eye",
                  6:"eye_g",7:"l_ear",8:"r_ear",9:"ear_r",10:"nose",
                  11:"mouth",12:"u_lip",13:"l_lip",14:"neck",15:"neck_l",
                  16:"cloth",17:"hair",18:"hat"}
    combined = np.zeros((1024, 1024), dtype=np.uint8)

    for step_idx, class_idx in enumerate(_CELEBA_HQ_MERGE_ORDER, 1):
        mp = class_to_path.get(class_idx)
        if mp is None:
            continue
        mask = cv2.imread(str(mp), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            continue
        if mask.shape != (1024, 1024):
            mask = cv2.resize(mask, (1024, 1024), interpolation=cv2.INTER_NEAREST)

        combined_before = combined.copy()
        combined[mask > 127] = class_idx

        fg_final = int((combined == class_idx).sum())
        classes_after = sorted(np.unique(combined).tolist())
        pixels_from_bg = int(((combined_before == 0) & (combined == class_idx)).sum())
        pixels_overwritten = fg_final - pixels_from_bg
        cls_name = order_name.get(class_idx, f"c{class_idx}")

        logger.info(
            "[{}/{}] class {} ({:<8s}) – fg={:>6d}  from_bg={:>6d}  overwrote={:>6d}  classes={}",
            step_idx, len(_CELEBA_HQ_MERGE_ORDER),
            class_idx, cls_name,
            fg_final, pixels_from_bg, pixels_overwritten,
            classes_after,
        )

        if pixels_overwritten > 0 and step_idx > 1:
            overwritten_mask = (combined_before > 0) & (combined_before != combined)
            old_vals = combined_before[overwritten_mask]
            if len(old_vals) > 0:
                counts = np.bincount(old_vals.astype(np.intp), minlength=19)
                details = ", ".join(
                    f"c{o} ({order_name.get(o,'?'):<6s}: {counts[o]}px)"
                    for o in np.nonzero(counts)[0] if o != class_idx
                )
                logger.info("         overwrote: {}", details)

    return combined


def main() -> None:
    logger.remove()
    logger.add(sys.stderr, format="<level>{level:7s}</level> | {message}")

    # Target image known to fail
    target_image_id = 29967

    # ── 1. Check ground_truth.csv ──
    gt_csv = BENCHMARK_DIR / "ground_truth.csv"
    logger.info("=== ground_truth.csv entry for image {} ===", target_image_id)
    with open(gt_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if int(row["image_id"]) == target_image_id:
                logger.info("  filename:    {}", row["filename"])
                logger.info("  mask_count:  {}", row["mask_count"])
                logger.info("  mask_files:  {}", row.get("mask_files", "N/A"))
                for k, v in row.items():
                    if k not in ("image_id", "filename", "mask_count", "mask_files"):
                        logger.info("  {}: {}", k, v)
                break
        else:
            logger.warning("Image {} not found in ground_truth.csv", target_image_id)

    # ── 2. Check benchmark masks directory ──
    _check_benchmark_masks(BENCHMARK_DIR, target_image_id)

    # ── 3. Explore source structure ──
    _explore_source_structure(CELEBA_SRC)
    _explore_source_masks_for_id(CELEBA_SRC, target_image_id)

    # Also check a smaller image ID for comparison
    _explore_source_masks_for_id(CELEBA_SRC, 18)

    # ── 4. Full pipeline + visual for a WORKING image (18) ──
    logger.info("\n" + "=" * 70)
    logger.info("FULL DEBUG: image 18 (should have masks)")
    logger.info("=" * 70)

    img_dir = BENCHMARK_DIR / "images"
    mask_dir = BENCHMARK_DIR / "masks"
    output_dir = BENCHMARK_DIR / "parsing_eval" / "debug_dataset"
    output_dir.mkdir(parents=True, exist_ok=True)

    for debug_id, debug_name in [(18, "working"), (target_image_id, "failing")]:
        filename = f"{debug_id}.jpg"
        img_path = img_dir / filename

        if not img_path.exists():
            logger.warning("Image not found: {}", img_path)
            continue

        logger.info("\n--- Processing {} ({}) ---", filename, debug_name)
        orig = cv2.imread(str(img_path))
        logger.info("Image shape: {}", orig.shape)

        # Run pipeline
        try:
            pipe = PipelineService(face_config=FaceDetectionConfig.PRESET_AGGRESSIVE)
            result = pipe.analyze_from_file(str(img_path))
            if result.get("status") != "success":
                logger.error("Pipeline failed for {}: {}", filename, result.get("error"))
                continue
        except Exception as e:
            logger.error("Pipeline exception for {}: {}", filename, e)
            continue

        encoded = result.get("parsing_mask_encoded")
        pred_mask = decode_mask_compact(encoded)
        crop_h, crop_w = pred_mask.shape
        logger.info("Predicted mask: shape={}, unique={}", pred_mask.shape, np.unique(pred_mask))

        # Load GT
        gt_full = _load_gt_masks_fixed(mask_dir, debug_id)
        fg_count = np.count_nonzero(gt_full)
        logger.info("GT full: shape={}, fg_px={}, unique={}", gt_full.shape, fg_count, np.unique(gt_full))

        # Align
        face_kps = result.get("face_alignment_keypoints")
        affine_matrix = result.get("affine_matrix")
        if face_kps:
            if affine_matrix is not None:
                M = np.array(affine_matrix, dtype=np.float64)
            else:
                kps_np = np.array(face_kps, dtype=np.float64)
                _est = face_align.estimate_norm(kps_np, image_size=crop_h)
                M = _est[0] if isinstance(_est, tuple) else _est

            # Before pixel counts
            before_classes = sorted(np.unique(gt_full).tolist())
            before_counts = {c: int((gt_full == c).sum()) for c in before_classes}
            for c in before_classes:
                logger.info("  Before: Class {:<2d} ({:<12s}): {:>8d} px",
                            c, _CLASS_IDX_TO_NAME.get(c, "?"), before_counts[c])

            gt_aligned = cv2.warpAffine(
                gt_full, M, (crop_w, crop_h),
                flags=cv2.INTER_NEAREST,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=0,
            )

            # After pixel counts
            after_classes = sorted(np.unique(gt_aligned).tolist())
            after_counts = {c: int((gt_aligned == c).sum()) for c in after_classes}
            for c in sorted(set(before_classes) | set(after_classes)):
                before_px = before_counts.get(c, 0)
                after_px = after_counts.get(c, 0)
                pct = (after_px / before_px * 100) if before_px > 0 else 0.0
                marker = " ⚠ DISAPPEARED" if before_px > 0 and after_px == 0 else ""
                logger.info("  After:  Class {:<2d} ({:<12s}): {:>8d} → {:>8d} px ({:>5.1f}%){}",
                            c, _CLASS_IDX_TO_NAME.get(c, "?"), before_px, after_px, pct, marker)

            logger.info("GT aligned: shape={}, fg_px={}, unique={}",
                        gt_aligned.shape, np.count_nonzero(gt_aligned), np.unique(gt_aligned))

            # Metrics
            metrics = compute_metrics(pred_mask, gt_aligned, num_classes=_NUM_CLASSES)
            logger.info("Pixel Acc: {:.2f}%, Mean IoU: {:.2f}%",
                        metrics["pixel_acc"] * 100, metrics["mean_iou"] * 100)
            per_class = metrics["per_class"]
            for i in range(_NUM_CLASSES):
                name = _CLASS_IDX_TO_NAME.get(i, f"c{i}")
                support = int(per_class["support"][i])
                iou_v = float(per_class["iou"][i]) * 100
                if support > 0:
                    logger.info("  {:20s} IoU={:>5.1f}%  support={:>8d}", name, iou_v, support)

        # Save visuals
        stem = f"{debug_id:05d}"
        gt_full_color = _colorize_mask(gt_full)
        pred_color = _colorize_mask(pred_mask)
        gt_aligned_color = _colorize_mask(gt_aligned) if 'gt_aligned' in dir() else None

        out = output_dir / debug_name
        out.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out / "01_original.jpg"), orig)
        cv2.imwrite(str(out / "02_gt_full.jpg"), gt_full_color)
        cv2.imwrite(str(out / "03_pred_mask.jpg"), pred_color)
        if gt_aligned_color is not None:
            cv2.imwrite(str(out / "04_gt_aligned.jpg"), gt_aligned_color)
            # Overlay
            orig_rs = cv2.resize(orig, (crop_w, crop_h))
            overlay_top = cv2.addWeighted(orig_rs, 0.6, pred_color, 0.4, 0)
            overlay_bot = cv2.addWeighted(orig_rs, 0.6, gt_aligned_color, 0.4, 0)
            cv2.imwrite(str(out / "05_overlay_top_pred_bot_gt.jpg"),
                        np.vstack([overlay_top, overlay_bot]))
            # Diff
            h, w = pred_mask.shape
            diff = np.full((h, w, 3), 128, dtype=np.uint8)
            correct = pred_mask == gt_aligned
            diff[correct] = (0, 180, 0)
            diff[~correct] = (0, 0, 200)
            cv2.imwrite(str(out / "06_difference.jpg"), diff)

        logger.info("Visuals saved to: {}", out)


if __name__ == "__main__":
    main()
