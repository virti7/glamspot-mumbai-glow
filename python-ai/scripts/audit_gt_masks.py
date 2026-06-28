#!/usr/bin/env python3
"""Audit GT mask construction for image 18.

Debugs ONLY the GT mask builder. Does NOT involve the model,
preprocessing, or alignment.

Uses the official CelebAMask-HQ compositing z-order: class indices
1 → 18 in ascending order.  Each mask *overwrites* the previous one
where they overlap, so smaller facial parts (eyes, brows, lips, …)
are on top of larger enclosing regions (skin, neck, cloth).

Actions:
  1. Lists every PNG file found (benchmark dir and CelebAMask-HQ source).
  2. Cross-checks suffix mapping vs known CelebAMask-HQ suffixes.
  3. Groups masks by class, composites in z-order (1→18).
  4. Saves every intermediate mask and combined state.
  5. Reports overwrite chain (which class overwrote which).
  6. Verifies all mask files contribute.
  7. Compares result vs old alphabetical file-order merge.
  8. Reports any unrecognised suffixes.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import cv2
import numpy as np

CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")
BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
OUTPUT_DIR = Path("audit_gt_18")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---- Suffix to class mapping — identical to evaluate_parsing.py ----
# (uses actual file suffix "neck_l", not the display name "necklace")
_CURRENT_MAPPING: dict[str, int] = {
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

# ---- Known CelebAMask-HQ suffixes (ground truth) ----
_KNOWN_SUFFIXES: dict[str, int] = {
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

_CLASS_NAMES: dict[int, str] = {
    0: "background",
    1: "skin", 2: "l_brow", 3: "r_brow",
    4: "l_eye", 5: "r_eye", 6: "eye_g",
    7: "l_ear", 8: "r_ear", 9: "ear_r",
    10: "nose", 11: "mouth", 12: "u_lip",
    13: "l_lip", 14: "neck", 15: "neck_l",
    16: "cloth", 17: "hair", 18: "hat",
}

# CelebAMask-HQ official g_mask.py list2 order, REVERSED so small
# facial details overwrite larger enclosing regions.
# Official order: skin → nose → eye_g → l_eye → r_eye → l_brow →
#   r_brow → l_ear → r_ear → mouth → u_lip → l_lip → hair → hat →
#   ear_r → neck_l → neck → cloth
# Reference: https://github.com/switchablenorms/CelebAMask-HQ/
#            blob/master/face_parsing/Data_preprocessing/g_mask.py
_MERGE_ORDER: list[int] = [
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


def _get_mask_subdir(image_id: int) -> str:
    """CelebAMask-HQ stores masks in subdirs grouped by 2000 images."""
    return str(image_id // 2000)


def audit_gt_construction(image_id: int = 18) -> None:
    print("=" * 70)
    print(f"  GT MASK AUDIT — image {image_id}")
    print("=" * 70)

    # ── 0. Mapping cross-check ──
    print("\n── CHECK 0: Suffix mapping completeness ──")
    print(f"{'Known suffix':>20} {'Expected class':>15} {'In mapping?':>12} {'Maps to':>10}")
    print("-" * 60)
    for suffix, expected_cls in sorted(_KNOWN_SUFFIXES.items()):
        current_cls = _CURRENT_MAPPING.get(suffix)
        if current_cls == expected_cls:
            status = "OK"
        elif current_cls is None:
            status = "MISSING"
        else:
            status = f"WRONG→c{current_cls}"
        print(f"{suffix:>20} {expected_cls:>15} {status:>12} {str(current_cls):>10}")

    # ── 1. Discover mask files ──
    print("\n── CHECK 1: Discovering mask files ──")

    # 1a. Benchmark masks directory
    bm_mask_dir = BENCHMARK_DIR / "masks"
    bm_pattern = f"{image_id:05d}_*.png"
    bm_files = sorted(bm_mask_dir.glob(bm_pattern))
    print(f"\n  Benchmark masks dir: {bm_mask_dir}")
    print(f"  Pattern: {bm_pattern}")
    print(f"  Files found: {len(bm_files)}")
    for f in bm_files:
        print(f"    {f.name}")

    # 1b. CelebAMask-HQ source directory
    src_dir = CELEBA_SRC / "CelebAMask-HQ-mask-anno" / _get_mask_subdir(image_id)
    src_files = sorted(src_dir.glob(bm_pattern)) if src_dir.is_dir() else []
    print(f"\n  CelebAMask-HQ source dir: {src_dir}")
    print(f"  Directory exists: {src_dir.is_dir()}")
    print(f"  Files found: {len(src_files)}")
    for f in src_files:
        print(f"    {f.name}")

    # Determine which files will actually be used by _load_gt_masks
    if bm_files:
        used_files = bm_files
        source_note = "BENCHMARK directory"
    elif src_files:
        used_files = src_files
        source_note = "CELEBAMASK-HQ source (fallback)"
    else:
        print("\n  *** NO MASK FILES FOUND — GT will be all background ***")
        used_files = []

    print(f"\n  Using {len(used_files)} files from: {source_note}")

    # ── 2. Check ground_truth.csv mask_count vs actual ──
    gt_csv = BENCHMARK_DIR / "ground_truth.csv"
    csv_mask_count = "N/A"
    csv_mask_files = []
    if gt_csv.exists():
        with open(gt_csv, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if int(row["image_id"]) == image_id:
                    csv_mask_count = row.get("mask_count", "?")
                    csv_mask_files_str = row.get("mask_files", "")
                    csv_mask_files = csv_mask_files_str.split(";") if csv_mask_files_str else []
                    break
    print(f"\n  ground_truth.csv mask_count:  {csv_mask_count}")
    print(f"  ground_truth.csv mask_files:  {len(csv_mask_files)}")

    # ── 3. Group masks by class ──
    print("\n── CHECK 2: Grouping masks by class ──")

    class_to_path: dict[int, Path] = {}
    class_to_file: dict[int, str] = {}
    unknown_files: list[tuple[str, str]] = []

    for mp in used_files:
        stem = mp.stem
        suffix = stem.split("_", 1)[1]
        class_idx = _CURRENT_MAPPING.get(suffix)
        if class_idx is None:
            note = f"Unknown suffix '{suffix}'"
            if suffix in _KNOWN_SUFFIXES:
                note += f" (known suffix maps to c{_KNOWN_SUFFIXES[suffix]}, not in _CURRENT_MAPPING)"
            print(f"  ⚠ {mp.name}: {note}")
            unknown_files.append((mp.name, suffix))
            continue
        class_to_path[class_idx] = mp
        class_to_file[class_idx] = mp.name

    print(f"\n  Classes found: {sorted(class_to_path.keys())}")
    for cls_idx, fname in sorted(class_to_file.items()):
        print(f"    c{cls_idx:2d} ({_CLASS_NAMES[cls_idx]:<20s}) → {fname}")

    # ── 4. Composite in CelebAMask-HQ z-order (reversed g_mask.py list2) ──
    print("\n── CHECK 3: CelebAMask-HQ z-order compositing ──")
    print("   Order (reversed g_mask.py list2, large → small):")
    print("     skin(1) → cloth(16) → neck(14) → neck_l(15) → ear_r(9) →")
    print("     hat(18) → hair(17) → l_lip(13) → u_lip(12) → mouth(11) →")
    print("     r_ear(8) → l_ear(7) → r_brow(3) → l_brow(2) →")
    print("     r_eye(5) → l_eye(4) → eye_g(6) → nose(10)")
    print("   Each mask OVERWRITES the previous one where they overlap.")

    combined = np.zeros((1024, 1024), dtype=np.uint8)
    step_num = 0

    for class_idx in _MERGE_ORDER:
        mp = class_to_path.get(class_idx)
        if mp is None:
            continue

        step_num += 1
        fname = mp.name

        # Read mask
        mask = cv2.imread(str(mp), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            print(f"\n  [{step_num}] Class {class_idx:2d} ({_CLASS_NAMES[class_idx]:<20s}) — FAILED TO READ")
            continue

        orig_shape = mask.shape
        fg_raw = int((mask > 127).sum())

        # Resize if needed
        if mask.shape != (1024, 1024):
            mask_resized = cv2.resize(mask, (1024, 1024), interpolation=cv2.INTER_NEAREST)
            fg_resized = int((mask_resized > 127).sum())
        else:
            mask_resized = mask
            fg_resized = fg_raw

        # Save original mask
        mask_path = OUTPUT_DIR / f"step{step_num:02d}_c{class_idx:02d}_{_CLASS_NAMES[class_idx]}_mask.png"
        cv2.imwrite(str(mask_path), mask)

        # Compute overwrite stats BEFORE applying
        classes_before = sorted(np.unique(combined).tolist())
        combined_before = combined.copy()
        bg_before = int((combined == 0).sum())

        # Apply: standard overwrite (official CelebAMask-HQ compositing)
        combined[mask_resized > 127] = class_idx

        classes_after = sorted(np.unique(combined).tolist())
        fg_final = int((combined == class_idx).sum())
        pixels_from_bg = int(((combined_before == 0) & (combined == class_idx)).sum())
        pixels_overwritten = fg_final - pixels_from_bg

        print(f"\n  [{step_num}] Class {class_idx:2d} ({_CLASS_NAMES[class_idx]:<20s})  file={fname}")
        print(f"         Shape {orig_shape}, raw_fg={fg_raw}, resized_fg={fg_resized}")
        print(f"         Final fg in GT: {fg_final}")
        print(f"         From background: {pixels_from_bg},  Overwrote previous: {pixels_overwritten}")

        if pixels_overwritten > 0:
            # show which classes were overwritten
            overwritten_mask = (combined_before > 0) & (combined_before != combined)
            old_vals = combined_before[overwritten_mask]
            counts = np.bincount(old_vals.astype(np.intp), minlength=19)
            overwritten_detail = ", ".join(
                f"c{o:d} ({counts[o]}px)" for o in np.nonzero(counts)[0] if o != class_idx
            )
            print(f"         Overwrote: {overwritten_detail}")

        print(f"         Combined classes so far: {classes_after}")

        # Save combined state
        combined_path = OUTPUT_DIR / f"step{step_num:02d}_c{class_idx:02d}_{_CLASS_NAMES[class_idx]}_combined.png"
        cv2.imwrite(str(combined_path), combined)

    # ── 5. Final GT statistics ──
    print("\n── CHECK 4: Final combined GT ──")
    print(f"  Shape:             {combined.shape}")
    print(f"  Data type:         {combined.dtype}")
    unique_classes = sorted(np.unique(combined).tolist())
    print(f"  Unique classes:    {unique_classes}")
    for cls_idx in range(19):
        count = int((combined == cls_idx).sum())
        if count > 0:
            print(f"    Class {cls_idx:2d} ({_CLASS_NAMES[cls_idx]:<20s}): {count:>8d} px ({100*count/combined.size:.2f}%)")

    fg_px = np.count_nonzero(combined)
    print(f"  Total foreground:  {fg_px} px ({100*fg_px/combined.size:.2f}%)")

    # ── 6. Save final combined mask ──
    final_path = OUTPUT_DIR / "final_combined_gt.png"
    cv2.imwrite(str(final_path), combined)
    print(f"\n  Saved final combined GT: {final_path}")

    # ── 7. Verify no skin overwrites ──
    print("\n── CHECK 5: Skin overwrite verification ──")
    skin_fg = int((combined == 1).sum())
    non_skin = (combined > 0) & (combined != 1)
    non_skin_count = int(non_skin.sum())

    print(f"  Skin pixels in final GT:          {skin_fg:>8d}")
    print(f"  Non-skin pixels in final GT:      {non_skin_count:>8d}")
    print(f"  Total face covered (fg):          {fg_px:>8d}")
    print(f"  Background (unlabeled):           {combined.size - fg_px:>8d}")

    # Cross-check: for each non-skin class, verify it exists in GT
    missing_classes = []
    for cls_idx in range(2, 19):  # skip background (0) and skin (1)
        name = _CLASS_NAMES[cls_idx]
        in_gt = int((combined == cls_idx).sum()) > 0
        if not in_gt:
            has_mask_file = cls_idx in class_to_path
            status = "no mask file" if not has_mask_file else "mask file exists but 0 pixels"
            missing_classes.append((cls_idx, name, status))

    if missing_classes:
        print(f"\n  ⚠ Classes absent from GT:")
        for cls_idx, name, reason in missing_classes:
            print(f"    c{cls_idx:2d} ({name:<20s}): {reason}")
    else:
        print(f"  ✓ All non-skin classes present in GT")

    # ── 8. vs alphabetical file-order merge (the old broken behavior) ──
    print("\n── CHECK 6: Comparison vs alphabetical file-order merge (old) ──")
    old_combined = np.zeros((1024, 1024), dtype=np.uint8)
    for mp in sorted(used_files):
        stem = mp.stem
        suffix = stem.split("_", 1)[1]
        class_idx = _CURRENT_MAPPING.get(suffix)
        if class_idx is None:
            continue
        mask = cv2.imread(str(mp), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            continue
        if mask.shape != (1024, 1024):
            mask = cv2.resize(mask, (1024, 1024), interpolation=cv2.INTER_NEAREST)
        old_combined[mask > 127] = class_idx

    old_classes = sorted(np.unique(old_combined).tolist())
    print(f"  Old-merge unique classes: {old_classes}")
    for cls_idx in range(19):
        old_count = int((old_combined == cls_idx).sum())
        new_count = int((combined == cls_idx).sum())
        if old_count != new_count:
            diff = new_count - old_count
            arrow = "↑" if diff > 0 else "↓"
            print(f"    c{cls_idx:2d} ({_CLASS_NAMES[cls_idx]:<20s}): old={old_count:>8d} → new={new_count:>8d}  {arrow} {abs(diff):>8d}")

    # ── 9. Report unknown/unrecognised suffixes ──
    print("\n── CHECK 7: Unknown / unrecognised suffixes ──")
    if unknown_files:
        print(f"  {len(unknown_files)} file(s) had unrecognised suffixes:")
        for fname, suffix in unknown_files:
            print(f"    • {fname}  (suffix='{suffix}')")
    else:
        print("  All suffixes recognised.")

    # ── 10. Summary ──
    print("\n── SUMMARY ──")
    print(f"  Total mask files discovered:  {len(used_files)}")
    print(f"  Classes merged (z-order):     {len([c for c in _MERGE_ORDER if c in class_to_path])}")
    print(f"  GT unique classes:            {unique_classes}")
    print(f"  GT total foreground pixels:   {fg_px}")
    print(f"  Background (unlabeled):        {combined.size - fg_px}")
    print(f"  Output directory:             {OUTPUT_DIR.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    audit_gt_construction()
