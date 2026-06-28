#!/usr/bin/env python3
"""Debug the parsing evaluation pipeline for a single image.

Checks each stage where foreground pixels could be lost and generates
a visual report.
"""

from __future__ import annotations

import base64
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


def _get_mask_subdir(image_id: int) -> str:
    """CelebAMask-HQ stores masks in subdirs grouped by 2000 images."""
    return str(image_id // 2000)


def _load_gt_masks(mask_dir: Path, image_id: int) -> np.ndarray:
    """Combine per-class CelebAMask-HQ masks into a single class-index map.

    CelebAMask-HQ per-part masks are stored at 512×512 but face
    detection keypoints are in 1024×1024 space.  Each mask is
    resized to 1024×1024 so that the affine alignment uses
    consistent coordinates.

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
            logger.debug("Unknown mask suffix: {} (file: {})", suffix, mp.name)
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
            logger.warning("Failed to read mask: {}", mp)
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


def _colorize_mask(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(_CLASS_COLORS):
        color[mask == cls_idx] = bgr
    return color


def mask_stats(mask: np.ndarray, label: str) -> dict:
    """Compute per-class pixel counts for a mask."""
    unique, counts = np.unique(mask, return_counts=True)
    total = mask.size
    stats = {}
    for cls_idx in range(_NUM_CLASSES):
        count = int(counts[unique == cls_idx].sum()) if cls_idx in unique else 0
        pct = count / total * 100 if total > 0 else 0
        stats[_CLASS_IDX_TO_NAME.get(cls_idx, f"c{cls_idx}")] = {
            "count": count, "pct": round(pct, 2)
        }
    fg_total = sum(v["count"] for k, v in stats.items() if k != "background")
    logger.info("[{}] shape={}, total_px={}, fg_px={} ({:.2f}%)",
                label, mask.shape, total, fg_total, fg_total / total * 100 if total else 0)
    for cname, cstats in stats.items():
        if cstats["count"] > 0 or cname == "background":
            logger.info("  {:20s} {:>8d} px ({:>6.2f}%)", cname, cstats["count"], cstats["pct"])
    return stats


def main() -> None:
    logger.remove()
    logger.add(sys.stderr, format="<level>{level:7s}</level> | {message}")

    img_dir = BENCHMARK_DIR / "images"
    mask_dir = BENCHMARK_DIR / "masks"

    # Pick first image from ground_truth.csv
    gt_csv = BENCHMARK_DIR / "ground_truth.csv"
    with open(gt_csv, newline="", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
    if not reader:
        logger.error("No entries in ground_truth.csv")
        sys.exit(1)

    entry = reader[0]
    filename = entry["filename"]
    image_id = int(entry["image_id"])
    img_path = img_dir / filename

    logger.info("=" * 70)
    logger.info("DEBUG REPORT FOR: {} (image_id={})", filename, image_id)
    logger.info("=" * 70)

    # ── Stage 1: Original image ──
    logger.info("\n── STAGE 1: Original image ──")
    orig = cv2.imread(str(img_path))
    if orig is None:
        logger.error("Cannot read image: {}", img_path)
        sys.exit(1)
    logger.info("Original image: shape={}, dtype={}", orig.shape, orig.dtype)

    # ── Stage 2: Run pipeline ──
    logger.info("\n── STAGE 2: Pipeline prediction ──")
    pipe = PipelineService(face_config=FaceDetectionConfig.PRESET_AGGRESSIVE)
    result = pipe.analyze_from_file(str(img_path))
    if result.get("status") != "success":
        logger.error("Pipeline failed: {}", result.get("error"))
        sys.exit(1)

    face_kps = result.get("face_alignment_keypoints")
    logger.info("Face keypoints: {}", face_kps)

    encoded = result.get("parsing_mask_encoded")
    pred_mask = decode_mask_compact(encoded)
    crop_h, crop_w = pred_mask.shape
    logger.info("Predicted mask: shape={}, dtype={}, unique_values={}",
                pred_mask.shape, pred_mask.dtype, np.unique(pred_mask))
    pred_stats = mask_stats(pred_mask, "pred_mask")

    # ── Stage 3: Load GT masks ──
    logger.info("\n── STAGE 3: GT mask loading ──")
    # Check mask files exist
    pattern = f"{image_id:05d}_*.png"
    mask_paths = sorted(mask_dir.glob(pattern))
    logger.info("Mask files found: {}", len(mask_paths))
    for mp in mask_paths:
        m = cv2.imread(str(mp), cv2.IMREAD_GRAYSCALE)
        logger.info("  {} -> shape={}, dtype={}, unique={}",
                    mp.name, m.shape if m is not None else "None",
                    m.dtype if m is not None else "N/A",
                    np.unique(m) if m is not None else "N/A")

    gt_full = _load_gt_masks(mask_dir, image_id)
    gt_stats_loaded = mask_stats(gt_full, "gt_full (loaded)")

    # ── Stage 4: GT alignment ──
    logger.info("\n── STAGE 4: GT alignment ──")

    affine_matrix = result.get("affine_matrix")
    if affine_matrix is not None:
        M = np.array(affine_matrix, dtype=np.float64)
        logger.info("Using stored affine_matrix from pipeline")
    else:
        kps_np = np.array(face_kps, dtype=np.float64)
        _est = face_align.estimate_norm(kps_np, image_size=crop_h)
        M = _est[0] if isinstance(_est, tuple) else _est
    logger.info("Affine matrix M:\n{}", M)

    # Before/after pixel counts
    before_classes = sorted(np.unique(gt_full).tolist())
    before_counts = {c: int((gt_full == c).sum()) for c in before_classes}
    logger.info("--- Before warp: per-class pixel counts ---")
    for c in before_classes:
        name = _CLASS_IDX_TO_NAME.get(c, f"c{c}")
        logger.info("  Class {:<2d} ({:<12s}): {:>8d} px", c, name, before_counts[c])

    gt_aligned = cv2.warpAffine(
        gt_full, M, (crop_w, crop_h),
        flags=cv2.INTER_NEAREST,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )

    after_classes = sorted(np.unique(gt_aligned).tolist())
    after_counts = {c: int((gt_aligned == c).sum()) for c in after_classes}
    logger.info("--- After warp: per-class pixel counts ---")
    for c in sorted(set(before_classes) | set(after_classes)):
        before_px = before_counts.get(c, 0)
        after_px = after_counts.get(c, 0)
        pct = (after_px / before_px * 100) if before_px > 0 else 0.0
        marker = " ⚠ DISAPPEARED" if before_px > 0 and after_px == 0 else ""
        logger.info("  Class {:<2d} ({:<12s}): {:>8d} → {:>8d} px ({:>5.1f}%){}",
                     c, _CLASS_IDX_TO_NAME.get(c, "?"), before_px, after_px, pct, marker)

    gt_stats_aligned = mask_stats(gt_aligned, "gt_aligned")

    # ── Stage 5: Shape check ──
    logger.info("\n── STAGE 5: Shape compatibility ──")
    logger.info("pred_mask.shape={}, gt_aligned.shape={}", pred_mask.shape, gt_aligned.shape)
    if pred_mask.shape != gt_aligned.shape:
        logger.warning("Shape mismatch! Resizing GT to match prediction...")
        gt_aligned = cv2.resize(
            gt_aligned, (crop_w, crop_h), interpolation=cv2.INTER_NEAREST,
        )
        gt_stats_after_resize = mask_stats(gt_aligned, "gt_aligned (after resize)")

    # ── Stage 6: Metrics ──
    logger.info("\n── STAGE 6: Metrics ──")
    metrics = compute_metrics(pred_mask, gt_aligned, num_classes=_NUM_CLASSES)
    logger.info("Pixel Acc: {:.4f} ({:.2f}%)", metrics["pixel_acc"], metrics["pixel_acc"] * 100)
    logger.info("Mean IoU:  {:.4f} ({:.2f}%)", metrics["mean_iou"], metrics["mean_iou"] * 100)

    cm = metrics["cm"]
    logger.info("Confusion matrix (diagonal = TP per class):")
    for i in range(_NUM_CLASSES):
        name = _CLASS_IDX_TO_NAME.get(i, f"c{i}")
        support = int(cm[i, :].sum())
        if support > 0 or i == 0:
            logger.info("  {:20s} support={:>8d}, tp={:>8d}", name, support, cm[i, i])

    per_class = metrics["per_class"]
    logger.info("\nPer-class IoU:")
    for i in range(_NUM_CLASSES):
        name = _CLASS_IDX_TO_NAME.get(i, f"c{i}")
        iou_v = float(per_class["iou"][i])
        support = int(per_class["support"][i])
        logger.info("  {:20s} IoU={:>6.2f}%, support={:>8d}", name, iou_v * 100, support)

    # ── Stage 7: Generate visual report ──
    logger.info("\n── STAGE 7: Visual report ──")
    output_dir = BENCHMARK_DIR / "parsing_eval" / "debug"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Original image
    cv2.imwrite(str(output_dir / "01_original.jpg"), orig)

    # Colored GT full
    gt_full_color = _colorize_mask(gt_full)
    cv2.imwrite(str(output_dir / "02_gt_full.jpg"), gt_full_color)

    # Colored GT aligned
    gt_aligned_color = _colorize_mask(gt_aligned)
    cv2.imwrite(str(output_dir / "03_gt_aligned.jpg"), gt_aligned_color)

    # Colored predicted mask
    pred_color = _colorize_mask(pred_mask)
    cv2.imwrite(str(output_dir / "04_pred_mask.jpg"), pred_color)

    # Overlay: pred vs original
    alpha = 0.4
    orig_resized = cv2.resize(orig, (crop_w, crop_h), interpolation=cv2.INTER_LINEAR)
    pred_overlay = cv2.addWeighted(orig_resized, 1 - alpha, pred_color, alpha, 0)
    gt_aligned_overlay = cv2.addWeighted(orig_resized, 1 - alpha, gt_aligned_color, alpha, 0)
    overlay_side = np.vstack([pred_overlay, gt_aligned_overlay])
    cv2.imwrite(str(output_dir / "05_overlay_pred_top_gt_bottom.jpg"), overlay_side)

    # Difference map
    h, w = pred_mask.shape
    diff = np.full((h, w, 3), 128, dtype=np.uint8)
    correct = pred_mask == gt_aligned
    diff[correct] = (0, 180, 0)       # green = correct
    diff[~correct] = (0, 0, 200)      # red = wrong
    cv2.imwrite(str(output_dir / "06_difference.jpg"), diff)

    # Per-class masks side by side for key classes (skin, hair, nose, eyes, mouth, brows)
    class_previews = []
    for cls_idx in [1, 17, 10, 4, 5, 2, 3, 11, 12, 13]:
        pred_binary = (pred_mask == cls_idx).astype(np.uint8) * 255
        gt_binary = (gt_aligned == cls_idx).astype(np.uint8) * 255
        combined_view = np.hstack([
            cv2.cvtColor(pred_binary, cv2.COLOR_GRAY2BGR),
            cv2.cvtColor(gt_binary, cv2.COLOR_GRAY2BGR),
        ])
        class_previews.append(combined_view)
    class_grid = np.vstack(class_previews)
    cv2.imwrite(str(output_dir / "07_per_class_pred_left_gt_right.jpg"), class_grid)

    logger.info("Visual report saved to: {}", output_dir)
    logger.info("Files:")
    for p in sorted(output_dir.glob("*.*")):
        logger.info("  {}", p.name)

    # ── Diagnosis ──
    logger.info("\n" + "=" * 70)
    logger.info("DIAGNOSIS")
    logger.info("=" * 70)

    # Check if GT loading preserves any foreground
    fg_in_gt_full = sum(gt_stats_loaded[k]["count"] for k in gt_stats_loaded if k != "background")
    if fg_in_gt_full == 0:
        logger.error("❌ STAGE 3 FAIL: GT mask has zero foreground pixels! Mask files not found or empty.")
    else:
        logger.info("✅ STAGE 3: GT loaded with {} foreground pixels", fg_in_gt_full)

    # Check if alignment preserves foreground
    fg_in_gt_aligned = sum(gt_stats_aligned[k]["count"] for k in gt_stats_aligned if k != "background")
    if fg_in_gt_aligned == 0:
        logger.error("❌ STAGE 4 FAIL: After alignment, GT has zero foreground pixels! Alignment maps wrong region.")
    else:
        logger.info("✅ STAGE 4: GT aligned with {} foreground pixels", fg_in_gt_aligned)

    total_pred_fg = sum(pred_stats[k]["count"] for k in pred_stats if k != "background")
    if total_pred_fg == 0:
        logger.error("❌ STAGE 2 FAIL: Predicted mask has zero foreground pixels! Pipeline produces all-background.")
    else:
        logger.info("✅ STAGE 2: Predicted mask has {} foreground pixels", total_pred_fg)

    # Show prediction vs GT agreement
    overlap = np.sum((pred_mask > 0) & (gt_aligned > 0))
    only_pred = np.sum((pred_mask > 0) & (gt_aligned == 0))
    only_gt = np.sum((pred_mask == 0) & (gt_aligned > 0))
    both_bg = np.sum((pred_mask == 0) & (gt_aligned == 0))
    logger.info("\nSpatial agreement (pred vs aligned GT):")
    logger.info("  Both foreground: {:>8d} px ({:>6.2f}%)", overlap, 100*overlap/(h*w))
    logger.info("  Pred only:       {:>8d} px ({:>6.2f}%)", only_pred, 100*only_pred/(h*w))
    logger.info("  GT only:         {:>8d} px ({:>6.2f}%)", only_gt, 100*only_gt/(h*w))
    logger.info("  Both background: {:>8d} px ({:>6.2f}%)", both_bg, 100*both_bg/(h*w))


if __name__ == "__main__":
    main()
