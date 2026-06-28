#!/usr/bin/env python3
"""Fix missing masks in GlamAI-Benchmark.

The original benchmark_generator.py used ``_get_mask_dir`` with
``"0" if image_id < 20000 else "1"``, but CelebAMask-HQ stores
masks in subdirectories 0…14 grouped by **2000 images** (``image_id // 2000``).

This script:
  1. Audits which benchmark images are missing masks.
  2. Copies missing masks from the CelebAMask-HQ source with the
     correct subdirectory logic.
  3. Updates ``ground_truth.csv`` with the corrected mask lists.
  4. Verifies completeness and prints a final report.
"""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")
BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")

CELEBA_MASK_ANNO = CELEBA_SRC / "CelebAMask-HQ-mask-anno"
CELEBA_IMG_DIR = CELEBA_SRC / "CelebA-HQ-img"
BMARK_IMG_DIR = BENCHMARK_DIR / "images"
BMARK_MASK_DIR = BENCHMARK_DIR / "masks"
GT_CSV = BENCHMARK_DIR / "ground_truth.csv"


def _get_mask_subdir(image_id: int) -> str:
    """CelebAMask-HQ stores masks in subdirs grouped by 2000 images."""
    return str(image_id // 2000)


def _collect_source_masks(image_id: int) -> list[Path]:
    """Return sorted mask paths from the CelebAMask-HQ source for *image_id*."""
    subdir = CELEBA_MASK_ANNO / _get_mask_subdir(image_id)
    if not subdir.is_dir():
        return []
    pattern = f"{image_id:05d}_*.png"
    return sorted(subdir.glob(pattern))


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

def audit_benchmark() -> list[dict]:
    """Read the ground truth CSV and produce an audit row per image."""
    if not GT_CSV.exists():
        print(f"ERROR: {GT_CSV} not found")
        sys.exit(1)

    with open(GT_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        csv_rows = list(reader)

    fieldnames = reader.fieldnames or []
    print(f"Loaded {len(csv_rows)} entries from {GT_CSV}")

    audit_rows: list[dict] = []
    for row in csv_rows:
        image_id = int(row["image_id"])
        img_path = BMARK_IMG_DIR / row["filename"]
        img_exists = img_path.is_file()

        # Count actual mask files on disk
        existing_masks = sorted(BMARK_MASK_DIR.glob(f"{image_id:05d}_*.png"))
        mask_count_on_disk = len(existing_masks)

        # Count expected masks from source
        source_masks = _collect_source_masks(image_id)
        expected_count = len(source_masks)

        audit_rows.append({
            "image_id": image_id,
            "image_exists": img_exists,
            "mask_count_csv": int(row["mask_count"]),
            "mask_count_disk": mask_count_on_disk,
            "expected_masks": expected_count,
            "missing": max(0, expected_count - mask_count_on_disk),
            "source_masks": source_masks,
            "csv_row": row,
            "fieldnames": fieldnames,
        })

    return audit_rows


def print_audit(audit_rows: list[dict]) -> None:
    """Pretty-print the audit table."""
    header = f"{'Image ID':>10} | {'Img Exists':>11} | {'Masks(CSV)':>10} | {'Masks(Disk)':>11} | {'Masks(Src)':>10} | {'Missing':>7}"
    sep = "=" * len(header)
    print()
    print(header)
    print(sep)

    total_missing = 0
    total_expected = 0
    total_on_disk = 0
    images_with_missing = 0
    images_with_all = 0

    for a in audit_rows:
        print(f"{a['image_id']:>10} | {str(a['image_exists']):>11} | {a['mask_count_csv']:>10} | {a['mask_count_disk']:>11} | {a['expected_masks']:>10} | {a['missing']:>7}")
        total_missing += a["missing"]
        total_expected += a["expected_masks"]
        total_on_disk += a["mask_count_disk"]
        if a["missing"] > 0:
            images_with_missing += 1
        elif a["expected_masks"] > 0:
            images_with_all += 1

    print(sep)
    print(f"{'TOTAL':>10} | {'':>11} | {sum(a['mask_count_csv'] for a in audit_rows):>10} | {total_on_disk:>11} | {total_expected:>10} | {total_missing:>7}")
    print()
    print(f"Benchmark images:         {len(audit_rows)}")
    print(f"Images with masks on disk: {sum(1 for a in audit_rows if a['mask_count_disk'] > 0)}")
    print(f"Images with expected > 0:  {sum(1 for a in audit_rows if a['expected_masks'] > 0)}")
    print(f"Images still missing:      {images_with_missing}")
    print(f"Masks expected total:      {total_expected}")
    print(f"Masks on disk total:       {total_on_disk}")
    print(f"Masks to copy:             {total_missing}")


# ---------------------------------------------------------------------------
# Fix
# ---------------------------------------------------------------------------

def copy_missing_masks(audit_rows: list[dict]) -> list[dict]:
    """Copy missing masks from CelebAMask-HQ source to benchmark.

    Returns the list of updated CSV rows.
    """
    updated_rows: list[dict] = []
    copied_total = 0

    for a in audit_rows:
        if a["missing"] == 0:
            # Masks already complete; keep row as-is
            updated_rows.append(a["csv_row"])
            continue

        image_id = a["image_id"]
        source_masks = a["source_masks"]

        if not source_masks:
            print(f"  WARNING: Image {image_id} — no source masks found in subdir {_get_mask_subdir(image_id)}")
            updated_rows.append(a["csv_row"])
            continue

        # Copy each source mask that doesn't already exist on disk
        copied_for_image = 0
        dst_names: list[str] = []
        for src_path in source_masks:
            dst_path = BMARK_MASK_DIR / src_path.name
            if dst_path.exists():
                dst_names.append(src_path.name)
                continue
            shutil.copy2(str(src_path), str(dst_path))
            dst_names.append(src_path.name)
            copied_for_image += 1

        copied_total += copied_for_image

        # Build updated CSV row
        updated_row = dict(a["csv_row"])
        updated_row["mask_count"] = str(len(dst_names))
        updated_row["mask_files"] = ";".join(dst_names)
        updated_rows.append(updated_row)

        if copied_for_image:
            print(f"  Copied {copied_for_image} masks for image {image_id}")

    return updated_rows, copied_total


def write_updated_csv(rows: list[dict], fieldnames: list[str]) -> None:
    """Write updated rows back to ground_truth.csv."""
    tmp_path = GT_CSV.with_suffix(".csv.tmp")
    with open(tmp_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    tmp_path.replace(GT_CSV)
    print(f"\nUpdated {GT_CSV}")


# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------

def verify_fix(audit_rows: list[dict]) -> dict:
    """Re-check mask counts after copying.

    Returns a summary dict.
    """
    all_expected = 0
    all_on_disk = 0
    still_missing = 0
    complete_images = 0

    for a in audit_rows:
        image_id = a["image_id"]
        expected = a["expected_masks"]
        on_disk = len(sorted(BMARK_MASK_DIR.glob(f"{image_id:05d}_*.png")))
        all_expected += expected
        all_on_disk += on_disk
        if expected > 0 and on_disk >= expected:
            complete_images += 1
        elif on_disk < expected:
            still_missing += 1

    return {
        "expected_total": all_expected,
        "on_disk_total": all_on_disk,
        "complete_images": complete_images,
        "still_missing_images": still_missing,
    }


def print_final_report(
    n_images: int,
    copied_total: int,
    verify: dict,
) -> None:
    """Print the final summary."""
    print()
    print("=" * 60)
    print("  FINAL REPORT")
    print("=" * 60)
    print(f"  Benchmark images:                {n_images}")
    print(f"  Masks copied:                    {copied_total}")
    print(f"  Images with complete masks:      {verify['complete_images']}")
    print(f"  Images still missing masks:      {verify['still_missing_images']}")
    print("=" * 60)
    if verify["still_missing_images"] == 0:
        print("  ✓ All benchmark images have their complete mask sets.")
    else:
        print(f"  ⚠ {verify['still_missing_images']} images still missing masks — check source directory.")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # ── 1. Check prerequisites ──
    if not CELEBA_MASK_ANNO.is_dir():
        print(f"ERROR: CelebAMask-HQ mask annotation directory not found:")
        print(f"       {CELEBA_MASK_ANNO}")
        sys.exit(1)

    subdirs = sorted(d for d in CELEBA_MASK_ANNO.iterdir() if d.is_dir())
    print(f"CelebAMask-HQ mask-anno subdirectories: {len(subdirs)}")
    print(f"  Names: {[d.name for d in subdirs]}")
    print()

    # ── 2. Audit ──
    audit = audit_benchmark()
    print_audit(audit)

    total_to_copy = sum(a["missing"] for a in audit)
    if total_to_copy == 0:
        print("\n✓ All masks already present — nothing to do.")
        return

    # ── 3. Fix ──
    print(f"\nCopying {total_to_copy} missing masks from CelebAMask-HQ source …")
    updated_rows, copied_total = copy_missing_masks(audit)

    # ── 4. Write updated CSV ──
    if audit:
        write_updated_csv(updated_rows, audit[0]["fieldnames"])

    # ── 5. Verify ──
    verify = verify_fix(audit)

    # ── 6. Final report ──
    print_final_report(n_images=len(audit), copied_total=copied_total, verify=verify)


if __name__ == "__main__":
    main()
