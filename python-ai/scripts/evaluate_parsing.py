#!/usr/bin/env python3
"""Parsing evaluation: compare GlamAI predicted masks vs CelebAMask-HQ ground truth.

Computes per-class IoU, Dice, precision, recall, F1, pixel accuracy,
mean IoU. Generates overlay visualizations, difference masks, and a
self-contained HTML report with Chart.js.

Usage:
    python scripts/evaluate_parsing.py
    python scripts/evaluate_parsing.py --limit 50 --workers 4
    python scripts/evaluate_parsing.py --resume
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from insightface.utils import face_align
from loguru import logger
from tqdm import tqdm

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.config.face_detection import FaceDetectionConfig
from app.services.pipeline_service import PipelineService, decode_mask_compact
from app.utils.parsing_metrics import aggregate_metrics, compute_metrics

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")

# ---------------------------------------------------------------------------
# Mask filename suffix → BiSeNet class index
# ---------------------------------------------------------------------------

_MASK_SUFFIX_TO_CLASS: dict[str, int] = {
    "skin": 1,
    "l_brow": 2,
    "r_brow": 3,
    "l_eye": 4,
    "r_eye": 5,
    "eye_g": 6,
    "l_ear": 7,
    "r_ear": 8,
    "ear_r": 9,
    "nose": 10,
    "mouth": 11,
    "u_lip": 12,
    "l_lip": 13,
    "neck": 14,
    "neck_l": 15,
    "cloth": 16,
    "hair": 17,
    "hat": 18,
}

# CelebAMask-HQ official mask generation order (from g_mask.py list2):
#   skin → nose → eye_g → l_eye → r_eye → l_brow → r_brow → l_ear → r_ear →
#   mouth → u_lip → l_lip → hair → hat → ear_r → neck_l → neck → cloth
#
# In that order, the LAST items (cloth, neck, neck_l, ear_r, hat, hair)
# overwrite EARLIER items (nose, eyes, brows, lips, mouth), which means
# large enclosing regions wipe out small facial details.
#
# We REVERSE the order (keeping skin as the base) so that small facial
# parts are composited LAST and therefore overwrite larger regions:
#   cloth → neck → neck_l → ear_r → hat → hair → l_lip → u_lip → mouth →
#   r_ear → l_ear → r_brow → l_brow → r_eye → l_eye → eye_g → nose  →  skin
#
# Reference: https://github.com/switchablenorms/CelebAMask-HQ/blob/
#            master/face_parsing/Data_preprocessing/g_mask.py
_CELEBA_HQ_MERGE_ORDER: list[int] = [
    1,   # skin       – face base (overwritten by everything)
    16,  # cloth      – large enclosing region
    14,  # neck       – large enclosing region
    15,  # neck_l     – on neck / cloth
    9,   # ear_r      – on ear
    18,  # hat        – on top of head / hair
    17,  # hair       – around head
    13,  # l_lip      – lip detail (overwrites large regions)
    12,  # u_lip      – lip detail
    11,  # mouth      – inner mouth
    8,   # r_ear      – ear
    7,   # l_ear      – ear
    3,   # r_brow     – eyebrow (overwrites skin / hair)
    2,   # l_brow     – eyebrow
    5,   # r_eye      – eye (overwrites skin)
    4,   # l_eye      – eye
    6,   # eye_g      – glasses (overwrites eyes / skin)
    10,  # nose       – centre face (overwrites skin / glasses)
]

_CLASS_IDX_TO_NAME: dict[int, str] = {
    0: "background",
    1: "skin",
    2: "l_brow",
    3: "r_brow",
    4: "l_eye",
    5: "r_eye",
    6: "eye_g",
    7: "l_ear",
    8: "r_ear",
    9: "ear_r",
    10: "nose",
    11: "mouth",
    12: "u_lip",
    13: "l_lip",
    14: "neck",
    15: "neck_l",
    16: "cloth",
    17: "hair",
    18: "hat",
}

_NUM_CLASSES = 19

# Colours for visualisation (BGR)
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

# ---------------------------------------------------------------------------
# Ground-truth mask loading
# ---------------------------------------------------------------------------


def _get_mask_subdir(image_id: int) -> str:
    """CelebAMask-HQ stores masks in subdirs grouped by 2000 images."""
    return str(image_id // 2000)


def _load_gt_masks(mask_dir: Path, image_id: int) -> np.ndarray:
    """Combine per-class CelebAMask-HQ masks into a single class-index map.

    CelebAMask-HQ per-part masks are stored at 512×512 but the face
    detection keypoints are in the original 1024×1024 image space.
    Each mask is therefore resized to 1024×1024 before combining so
    that the subsequent affine alignment (``estimate_norm`` /
    ``warpAffine``) uses consistent coordinates.

    Masks are composited using the CelebAMask-HQ official ``g_mask.py``
    ``list2`` order but REVERSED: large enclosing regions (cloth, neck,
    hair) are applied *first*, while small facial details (brows, eyes,
    lips, nose) are applied *last*, so that details overwrite any
    overlapping larger regions.
    
    Reference: https://github.com/switchablenorms/CelebAMask-HQ/blob/
               master/face_parsing/Data_preprocessing/g_mask.py

    Falls back to the CelebAMask-HQ source tree when the benchmark
    directory does not contain the required mask files (the benchmark
    generator used an incorrect subdirectory grouping).

    Args:
        mask_dir: Benchmark ``masks/`` directory.
        image_id: Numeric CelebA-HQ image ID.

    Returns:
        2-D uint8 mask (1024×1024) with class indices.
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

    # Composite using the reversed CelebAMask-HQ g_mask.py z-order.
    # Large enclosing regions (cloth, neck, hair) are applied FIRST,
    # then small facial details (brows, eyes, lips, nose) LAST so
    # that details overwrite any overlapping larger regions.
    combined = np.zeros((1024, 1024), dtype=np.uint8)
    order_name = {1: "skin", 2: "l_brow", 3: "r_brow", 4: "l_eye", 5: "r_eye",
                  6: "eye_g", 7: "l_ear", 8: "r_ear", 9: "ear_r", 10: "nose",
                  11: "mouth", 12: "u_lip", 13: "l_lip", 14: "neck", 15: "neck_l",
                  16: "cloth", 17: "hair", 18: "hat"}

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
                    f"c{o} ({order_name.get(o, '?'):<6s}: {counts[o]}px)"
                    for o in np.nonzero(counts)[0] if o != class_idx
                )
                logger.info("         overwrote: {}", details)

    return combined


# ---------------------------------------------------------------------------
# GT mask alignment
# ---------------------------------------------------------------------------


def _align_gt_mask(
    gt_full: np.ndarray,
    crop_h: int,
    crop_w: int,
    affine_matrix: list[list[float]] | None = None,
    face_kps: list[list[float]] | None = None,
    image_id: int = 0,
) -> np.ndarray:
    """Align GT mask using the same affine transform as norm_crop.

    Uses the stored affine matrix when available (guarantees exact
    transform parity with the image warp). Falls back to recomputing
    from keypoints.

    Uses INTER_NEAREST to preserve discrete class labels during the
    affine transform.
    """
    if affine_matrix is not None:
        M = np.array(affine_matrix, dtype=np.float64)
    elif face_kps is not None:
        kps_np = np.array(face_kps, dtype=np.float64)
        _est = face_align.estimate_norm(kps_np, image_size=crop_h)
        M = _est[0] if isinstance(_est, tuple) else _est
    else:
        raise ValueError("Either affine_matrix or face_kps must be provided")

    # Log before counts
    before_classes = sorted(np.unique(gt_full).tolist())
    before_counts = {c: int((gt_full == c).sum()) for c in before_classes}

    gt_aligned = cv2.warpAffine(
        gt_full, M, (crop_w, crop_h),
        flags=cv2.INTER_NEAREST,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )

    # Log after counts
    after_classes = sorted(np.unique(gt_aligned).tolist())
    after_counts = {c: int((gt_aligned == c).sum()) for c in after_classes}

    disappeared = set(before_classes) - set(after_classes)
    if disappeared:
        logger.warning(
            "Image {} — classes disappeared after warp: {}",
            image_id,
            {c: before_counts[c] for c in sorted(disappeared)},
        )

    for c in sorted(set(before_classes) | set(after_classes)):
        before_px = before_counts.get(c, 0)
        after_px = after_counts.get(c, 0)
        if before_px != after_px:
            pct = (after_px / before_px * 100) if before_px > 0 else 0.0
            logger.info(
                "  Class {:<2d} ({:<12s}): {:>8d} → {:>8d} px ({:>5.1f}%)",
                c, _CLASS_IDX_TO_NAME.get(c, "?"),
                before_px, after_px, pct,
            )

    return gt_aligned


# ---------------------------------------------------------------------------
# Visualisation helpers
# ---------------------------------------------------------------------------


def _colorize_mask(mask: np.ndarray) -> np.ndarray:
    """Convert a class-index map to a BGR colour image."""
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(_CLASS_COLORS):
        color[mask == cls_idx] = bgr
    return color


def _make_overlay(
    image: np.ndarray,
    pred_mask: np.ndarray,
    gt_mask: np.ndarray,
    alpha: float = 0.4,
) -> np.ndarray:
    """Create side-by-side overlay of predictions and ground truth.

    The *image* is resized to match the mask dimensions so that
    ``addWeighted`` receives same-sized operands.
    """
    pred_color = _colorize_mask(pred_mask)
    gt_color = _colorize_mask(gt_mask)

    h, w = gt_mask.shape
    if image.shape[:2] != (h, w):
        image = cv2.resize(image, (w, h), interpolation=cv2.INTER_LINEAR)

    pred_overlay = cv2.addWeighted(image, 1 - alpha, pred_color, alpha, 0)
    gt_overlay = cv2.addWeighted(image, 1 - alpha, gt_color, alpha, 0)

    return np.vstack([pred_overlay, gt_overlay])


def _make_difference_map(
    pred: np.ndarray,
    gt: np.ndarray,
) -> np.ndarray:
    """Create a BGR difference map: correct=green, error=red over grey."""
    h, w = pred.shape
    diff = np.full((h, w, 3), 128, dtype=np.uint8)
    correct = pred == gt
    diff[correct] = (0, 180, 0)
    error_mask = ~correct
    diff[error_mask] = (0, 0, 200)
    return diff


# ---------------------------------------------------------------------------
# Single image evaluation
# ---------------------------------------------------------------------------


def _parse_image_id(filename: str) -> int:
    """Extract numeric image ID from '12345.jpg'."""
    return int(Path(filename).stem)


def _evaluate_one(
    pipe: PipelineService,
    img_path: Path,
    mask_dir: Path,
    filename: str,
    output_dir: Path,
    save_visuals: bool = True,
) -> dict[str, Any]:
    """Evaluate parsing for a single image.

    Returns a dict with metrics, or an error record.
    """
    record: dict[str, Any] = {
        "filename": filename,
        "status": "error",
        "error": None,
        "pixel_acc": 0.0,
        "mean_iou": 0.0,
        "per_class_iou": {},
        "path": None,
    }

    try:
        result = pipe.analyze_from_file(str(img_path))
        if result.get("status") != "success":
            record["error"] = "Pipeline did not return success"
            return record

        face_kps = result.get("face_alignment_keypoints")
        if face_kps is None:
            record["error"] = "No face alignment keypoints"
            return record

        kps_np = np.array(face_kps, dtype=np.float64)
        if kps_np.shape != (5, 2):
            record["error"] = f"Invalid keypoints shape: {kps_np.shape}"
            return record

        # Decode predicted mask
        encoded = result.get("parsing_mask_encoded")
        if encoded is None:
            record["error"] = "No parsing mask in result"
            return record
        pred_mask = decode_mask_compact(encoded)
        crop_h, crop_w = pred_mask.shape

        # Load + combine GT masks
        image_id = _parse_image_id(filename)
        gt_full = _load_gt_masks(mask_dir, image_id)

        # Align GT mask to the same reference frame as the prediction
        affine_matrix = result.get("affine_matrix")
        gt_aligned = _align_gt_mask(
            gt_full, crop_h, crop_w,
            affine_matrix=affine_matrix,
            face_kps=face_kps,
            image_id=image_id,
        )

        # Both masks must have same dimensions
        if pred_mask.shape != gt_aligned.shape:
            gt_aligned = cv2.resize(
                gt_aligned, (crop_w, crop_h), interpolation=cv2.INTER_NEAREST,
            )

        # Compute metrics
        metrics = compute_metrics(pred_mask, gt_aligned, num_classes=_NUM_CLASSES)
        per_class = metrics["per_class"]

        # Build per-class IoU dict
        iou_dict: dict[str, float] = {}
        for cls_idx in range(_NUM_CLASSES):
            name = _CLASS_IDX_TO_NAME.get(cls_idx, f"class_{cls_idx}")
            iou_dict[name] = float(per_class["iou"][cls_idx])

        record["status"] = "success"
        record["pixel_acc"] = metrics["pixel_acc"]
        record["mean_iou"] = metrics["mean_iou"]
        record["per_class_iou"] = iou_dict
        record["cm"] = metrics["cm"]

        # Save visualizations
        if save_visuals:
            stem = Path(filename).stem
            vis_dir = output_dir / "visuals"
            vis_dir.mkdir(parents=True, exist_ok=True)

            overlay = _make_overlay(
                cv2.imread(str(img_path)), pred_mask, gt_aligned,
            )
            cv2.imwrite(str(vis_dir / f"{stem}_overlay.jpg"), overlay)

            diff = _make_difference_map(pred_mask, gt_aligned)
            h_orig = cv2.imread(str(img_path)).shape[0]
            diff_big = cv2.resize(
                diff, (int(crop_w * h_orig / crop_h), h_orig),
                interpolation=cv2.INTER_NEAREST,
            )
            cv2.imwrite(str(vis_dir / f"{stem}_diff.jpg"), diff_big)

            record["path"] = {
                "overlay": f"visuals/{stem}_overlay.jpg",
                "diff": f"visuals/{stem}_diff.jpg",
            }

        return record

    except Exception as exc:
        record["error"] = str(exc)
        logger.debug("Failed {}: {}", filename, exc)
        return record


# ---------------------------------------------------------------------------
# HTML report
# ---------------------------------------------------------------------------


def _build_html_report(
    global_metrics: dict,
    per_image_results: list[dict],
    class_names: list[str],
    output_dir: Path,
) -> str:
    """Build a comprehensive self-contained HTML report."""
    now = datetime.now().isoformat()
    n_total = global_metrics.get("num_images", 0)
    cm = global_metrics.get("cm")
    per_class = global_metrics.get("per_class", {})

    # Summary cards
    cards = f"""
<div class='card-grid'>
  <div class='card'><h3>Images</h3><div class='big'>{n_total}</div></div>
  <div class='card'><h3>Pixel Acc</h3><div class='big'>{global_metrics.get('pixel_acc', 0)*100:.2f}%</div></div>
  <div class='card'><h3>Mean IoU</h3><div class='big'>{global_metrics.get('mean_iou', 0)*100:.2f}%</div></div>
  <div class='card'><h3>FW-IoU</h3><div class='big'>{global_metrics.get('fw_iou', 0)*100:.2f}%</div></div>
</div>"""

    # Per-class table
    table_rows = ""
    max_iou = 0.0
    min_iou = 1.0
    for i, name in enumerate(class_names):
        iou = float(per_class["iou"][i]) * 100
        dice = float(per_class["dice"][i]) * 100
        prec = float(per_class["precision"][i]) * 100
        rec = float(per_class["recall"][i]) * 100
        f1 = float(per_class["f1"][i]) * 100
        support = int(per_class["support"][i])
        max_iou = max(max_iou, iou)
        min_iou = min(min_iou, iou)
        color = "#27ae60" if iou > 70 else "#f39c12" if iou > 40 else "#e74c3c"
        table_rows += f"<tr style='background:{'#f9f9fb' if i % 2 == 0 else '#fff'}'><td>{name}</td><td style='color:{color}'>{iou:.1f}%</td><td>{dice:.1f}%</td><td>{prec:.1f}%</td><td>{rec:.1f}%</td><td>{f1:.1f}%</td><td>{support:,}</td></tr>\n"

    # Confusion matrix heatmap data (top-8 classes for readability)
    cm_data = cm.tolist() if cm is not None else []
    cm_labels = json.dumps(class_names)
    cm_values = json.dumps(cm_data)

    # Sort samples by mean IoU for failure analysis
    sorted_results = sorted(
        [r for r in per_image_results if r["status"] == "success"],
        key=lambda x: x.get("mean_iou", 0),
    )
    failures_html = ""
    for res in sorted_results[:12]:
        fn = res["filename"]
        miou = res.get("mean_iou", 0) * 100
        paths = res.get("path", {})
        overlay_rel = paths.get("overlay", "") if paths else ""
        diff_rel = paths.get("diff", "") if paths else ""
        failures_html += f"""
<div class='sample'>
  <div class='sample-header'>{fn} — mIoU={miou:.1f}%</div>
  <div class='sample-imgs'>
    <img src='{overlay_rel}' alt='{fn} overlay'>
    <img src='{diff_rel}' alt='{fn} diff'>
  </div>
</div>"""
    if not failures_html:
        failures_html = "<p>No samples available.</p>"

    chart_labels = json.dumps(class_names)
    chart_iou = json.dumps([float(per_class["iou"][i]) * 100 for i in range(len(class_names))])
    chart_dice = json.dumps([float(per_class["dice"][i]) * 100 for i in range(len(class_names))])
    chart_prec = json.dumps([float(per_class["precision"][i]) * 100 for i in range(len(class_names))])
    chart_rec = json.dumps([float(per_class["recall"][i]) * 100 for i in range(len(class_names))])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GlamAI — Face Parsing Evaluation</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f9; color: #1a1a2e; padding: 2rem; }}
  .container {{ max-width: 1400px; margin: 0 auto; }}
  h1 {{ font-size: 1.8rem; margin-bottom: 0.25rem; color: #16213e; }}
  .subtitle {{ color: #666; margin-bottom: 2rem; font-size: 0.95rem; }}
  .card-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
  .card {{ background: #fff; border-radius: 10px; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .card h3 {{ font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }}
  .card .big {{ font-size: 2rem; font-weight: 700; color: #16213e; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1.5rem; font-size: 0.85rem; }}
  th, td {{ padding: 0.5rem 0.8rem; text-align: right; }}
  th {{ background: #16213e; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 0.7rem; text-align: right; }}
  th:first-child, td:first-child {{ text-align: left; }}
  tr:nth-child(even) {{ background: #f9f9fb; }}
  .section {{ margin-bottom: 2rem; }}
  .section h2 {{ font-size: 1.2rem; margin-bottom: 0.75rem; color: #16213e; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.4rem; }}
  .charts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }}
  .chart-card {{ background: #fff; border-radius: 10px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .chart-card h3 {{ font-size: 0.9rem; margin-bottom: 0.5rem; }}
  .sample {{ background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1rem; }}
  .sample-header {{ padding: 0.5rem 1rem; background: #16213e; color: #fff; font-weight: 600; font-size: 0.85rem; }}
  .sample-imgs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0; }}
  .sample-imgs img {{ width: 100%; height: auto; display: block; }}
</style>
</head>
<body>
<div class="container">

<h1>GlamAI — Face Parsing Evaluation</h1>
<p class="subtitle">Generated {now} &middot; {n_total} images &middot; BiSeNet CelebAMask-HQ</p>

{cards}

<div class='section'>
  <h2>Per-Class Metrics</h2>
  <table>
    <tr><th>Class</th><th>IoU</th><th>Dice</th><th>Precision</th><th>Recall</th><th>F1</th><th>Pixels</th></tr>
    {table_rows}
  </table>
</div>

<div class='charts'>
  <div class='chart-card'><h3>IoU by Class</h3><canvas id='iouChart'></canvas></div>
  <div class='chart-card'><h3>Precision & Recall</h3><canvas id='prChart'></canvas></div>
</div>

<div class='section'>
  <h2>Sample Failures <small>(lowest mIoU)</small></h2>
  <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:1rem;'>
    {failures_html}
  </div>
</div>

<div class='section'>
  <h2>Confusion Matrix (pixels)</h2>
  <div class='chart-card'><canvas id='cmChart'></canvas></div>
</div>

</div>

<script>
  const iouCtx = document.getElementById('iouChart').getContext('2d');
  new Chart(iouCtx, {{
    type: 'bar',
    data: {{
      labels: {chart_labels},
      datasets: [{{
        label: 'IoU (%)',
        data: {chart_iou},
        backgroundColor: {chart_iou}.map(v => v > 70 ? '#27ae60' : v > 40 ? '#f39c12' : '#e74c3c'),
        borderRadius: 4,
      }}]
    }},
    options: {{
      responsive: true,
      indexAxis: 'y',
      plugins: {{ legend: {{ display: false }} }},
      scales: {{ x: {{ beginAtZero: true, max: 100, ticks: {{ suffix: '%' }} }} }}
    }}
  }});

  const prCtx = document.getElementById('prChart').getContext('2d');
  new Chart(prCtx, {{
    type: 'bar',
    data: {{
      labels: {chart_labels},
      datasets: [
        {{ label: 'Precision', data: {chart_prec}, backgroundColor: '#3498db', borderRadius: 4 }},
        {{ label: 'Recall', data: {chart_rec}, backgroundColor: '#9b59b6', borderRadius: 4 }},
      ]
    }},
    options: {{
      responsive: true,
      indexAxis: 'y',
      scales: {{ x: {{ beginAtZero: true, max: 100, ticks: {{ suffix: '%' }} }} }}
    }}
  }});

  const cmCtx = document.getElementById('cmChart').getContext('2d');
  const cmData = {cm_values};
  const cmLabels = {cm_labels};
  const cmMax = Math.max(...cmData.flat());
  const cmBg = cmData.map(row => row.map(v => {{
    const intensity = v / cmMax;
    return `rgba(0, 100, 200, ${{intensity}})`;
  }}));
  new Chart(cmCtx, {{
    type: 'matrix',
    data: {{
      datasets: [{{
        labels: cmLabels,
        data: cmData.flatMap((row, i) => row.map((v, j) => ({{ x: j, y: i, v: v }}))),
        backgroundColor(ctx) {{ return cmBg[ctx.dataset.data[ctx.dataIndex].y][ctx.dataset.data[ctx.dataIndex].x]; }},
        width({{chart}}) {{ return chart.chartArea.width / cmLabels.length - 2; }},
        height({{chart}}) {{ return chart.chartArea.height / cmLabels.length - 2; }},
      }}]
    }},
    options: {{
      responsive: true,
      scales: {{
        x: {{ type: 'category', labels: cmLabels, offset: false }},
        y: {{ type: 'category', labels: cmLabels, offset: false, reverse: true }},
      }},
      plugins: {{
        legend: {{ display: false }},
        tooltip: {{
          callbacks: {{
            label(ctx) {{ return `${{cmLabels[ctx.raw.x]}} → ${{cmLabels[ctx.raw.y]}}: ${{ctx.raw.v.toLocaleString()}}`; }}
          }}
        }}
      }}
    }}
  }});
</script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------


PRESET_MAP = {
    "original": FaceDetectionConfig.PRESET_ORIGINAL,
    "aggressive": FaceDetectionConfig.PRESET_AGGRESSIVE,
    "max_recall": FaceDetectionConfig.PRESET_MAX_RECALL,
}


def _worker_process(args: tuple) -> dict:
    """Multiprocessing worker: create pipe once, evaluate one image."""
    img_path_str, mask_dir_str, filename, output_dir_str, preset_name = args
    img_path = Path(img_path_str)
    mask_dir = Path(mask_dir_str)
    output_dir = Path(output_dir_str)
    config = PRESET_MAP.get(preset_name, FaceDetectionConfig.PRESET_AGGRESSIVE)
    pipe = PipelineService(face_config=config)
    return _evaluate_one(pipe, img_path, mask_dir, filename, output_dir, save_visuals=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate face parsing accuracy")
    parser.add_argument("--benchmark", type=str, default=str(BENCHMARK_DIR))
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--resume", action="store_true", help="Skip images with existing results")
    parser.add_argument(
        "--preset", type=str, default="aggressive",
        choices=["original", "aggressive", "max_recall"],
        help="Face detection preset to use",
    )
    args = parser.parse_args()

    benchmark_dir = Path(args.benchmark)
    img_dir = benchmark_dir / "images"
    mask_dir = benchmark_dir / "masks"
    output_dir = benchmark_dir / "parsing_eval"
    output_dir.mkdir(parents=True, exist_ok=True)
    results_dir = output_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    if not mask_dir.is_dir():
        logger.error("Masks directory not found: {}", mask_dir)
        sys.exit(1)

    gt_csv = benchmark_dir / "ground_truth.csv"
    if not gt_csv.exists():
        logger.error("ground_truth.csv not found")
        sys.exit(1)

    with open(gt_csv, newline="", encoding="utf-8") as f:
        images = list(csv.DictReader(f))
    if args.limit is not None:
        images = images[:args.limit]
    logger.info("Loaded {} images from {}", len(images), gt_csv)

    config = PRESET_MAP[args.preset]
    logger.info("Using preset: {} (det_size={}, det_thresh={})",
                args.preset, config.detection_size, config.detection_threshold)

    # Prepare tasks
    tasks: list[tuple] = []
    for entry in images:
        filename = entry["filename"]
        img_path = img_dir / filename
        if not img_path.exists():
            continue
        result_json = results_dir / f"{Path(filename).stem}.json"
        if args.resume and result_json.exists():
            continue
        tasks.append((str(img_path), str(mask_dir), filename, str(output_dir), args.preset))

    logger.info("Processing {} images ({} workers)", len(tasks), args.workers)

    per_image_results: list[dict] = []

    if args.workers > 1:
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(_worker_process, t): t[2] for t in tasks}
            for future in tqdm(as_completed(futures), total=len(tasks), desc="Parsing eval", unit="img"):
                filename = futures[future]
                try:
                    record = future.result()
                except Exception as exc:
                    record = {"filename": filename, "status": "error", "error": str(exc)}
                per_image_results.append(record)
                # Save per-image result
                save_path = results_dir / f"{Path(filename).stem}.json"
                _save_record(save_path, record)
    else:
        pipe = PipelineService(face_config=config)
        for entry in tqdm(images, desc="Parsing eval", unit="img"):
            filename = entry["filename"]
            img_path = img_dir / filename
            if not img_path.exists():
                continue
            result_json = results_dir / f"{Path(filename).stem}.json"
            if args.resume and result_json.exists():
                continue
            record = _evaluate_one(pipe, img_path, mask_dir, filename, output_dir, save_visuals=True)
            per_image_results.append(record)
            _save_record(result_json, record)

    # Aggregate
    success = [r for r in per_image_results if r["status"] == "success"]
    errors = [r for r in per_image_results if r["status"] == "error"]

    logger.info("Done: {} success, {} error / {}", len(success), len(errors), len(per_image_results))

    if not success:
        logger.error("No successful evaluations — nothing to report.")
        sys.exit(1)

    global_metrics = aggregate_metrics(success)

    # Log summary
    logger.info("=" * 55)
    logger.info("PARSING EVALUATION SUMMARY")
    logger.info("  Images evaluated  {}", global_metrics.get("num_images", 0))
    logger.info("  Pixel accuracy    {:.4f}  ({:.2f}%)", global_metrics.get("pixel_acc", 0), global_metrics.get("pixel_acc", 0) * 100)
    logger.info("  Mean IoU          {:.4f}  ({:.2f}%)", global_metrics.get("mean_iou", 0), global_metrics.get("mean_iou", 0) * 100)
    logger.info("  FW-IoU            {:.4f}  ({:.2f}%)", global_metrics.get("fw_iou", 0), global_metrics.get("fw_iou", 0) * 100)
    logger.info("  Per-class IoU:")
    per_class = global_metrics.get("per_class", {})
    for i in range(_NUM_CLASSES):
        name = _CLASS_IDX_TO_NAME.get(i, f"class_{i}")
        iou_v = float(per_class["iou"][i]) * 100
        logger.info("    %-20s  %5.1f%%", name, iou_v)
    logger.info("=" * 55)

    # Generate HTML report
    class_names = [_CLASS_IDX_TO_NAME.get(i, f"class_{i}") for i in range(_NUM_CLASSES)]
    html = _build_html_report(global_metrics, success, class_names, output_dir)
    report_path = output_dir / "parsing_report.html"
    report_path.write_text(html, encoding="utf-8")
    logger.info("Report written to {}", report_path)

    # Save global metrics as CSV
    csv_path = output_dir / "parsing_metrics.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["class", "iou", "dice", "precision", "recall", "f1", "support"])
        for i in range(_NUM_CLASSES):
            name = class_names[i]
            writer.writerow([
                name,
                f"{float(per_class['iou'][i])*100:.2f}",
                f"{float(per_class['dice'][i])*100:.2f}",
                f"{float(per_class['precision'][i])*100:.2f}",
                f"{float(per_class['recall'][i])*100:.2f}",
                f"{float(per_class['f1'][i])*100:.2f}",
                int(per_class["support"][i]),
            ])
    logger.info("Metrics CSV written to {}", csv_path)


def _save_record(path: Path, record: dict) -> None:
    """Save a per-image result JSON (pop cm from the dict to keep it small)."""
    save = {k: v for k, v in record.items() if k != "cm"}
    if "cm" in record:
        cm = record["cm"]
        save["cm_shape"] = list(cm.shape)
        save["cm_sum"] = int(cm.sum())
    with open(path, "w", encoding="utf-8") as f:
        json.dump(save, f, default=str)


if __name__ == "__main__":
    main()
