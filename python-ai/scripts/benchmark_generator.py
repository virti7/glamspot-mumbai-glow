#!/usr/bin/env python3
"""Generate GlamAI-Benchmark dataset from CelebAMask-HQ.

Randomly selects N images, copies images + masks, and generates
``ground_truth.csv`` for automated evaluation.

Usage:
    python scripts/benchmark_generator.py
    python scripts/benchmark_generator.py --num 100 --seed 123
    python scripts/benchmark_generator.py --src D:/Data/CelebAMask-HQ --dst D:/Data/GlamAI-Benchmark
"""

import argparse
import csv
import logging
import random
import shutil
import sys
from pathlib import Path

from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("benchmark_generator")

CELEBA_SRC = Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ")
BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")
NUM_SAMPLES = 500
RANDOM_SEED = 42


def _parse_attributes(path: Path) -> tuple[list[str], dict[int, dict[str, int]]]:
    """Parse CelebAMask-HQ attribute annotation file.

    Returns:
        (attribute_names, per_image_attributes)
    """
    text = path.read_text(encoding="utf-8").strip().splitlines()
    attr_names = text[1].strip().split()
    result: dict[int, dict[str, int]] = {}
    for line in text[2:]:
        parts = line.strip().split()
        if not parts:
            continue
        img_id = int(parts[0].replace(".jpg", ""))
        values = [int(v) for v in parts[1:]]
        result[img_id] = dict(zip(attr_names, values))
    return attr_names, result


def _get_mask_dir(mask_root: Path, image_id: int) -> Path:
    """Determine mask subdirectory based on image ID.

    CelebAMask-HQ stores masks in subdirectories grouped by 2000
    images (subdirs 0 … 14).
    """
    subdir = str(image_id // 2000)
    return mask_root / subdir


def _collect_mask_files(mask_root: Path, image_id: int) -> list[Path]:
    """Collect all mask PNG files for a given CelebAMask-HQ image ID."""
    mask_dir = _get_mask_dir(mask_root, image_id)
    prefix = f"{image_id:05d}_"
    return sorted(mask_dir.glob(f"{prefix}*.png"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate GlamAI-Benchmark dataset")
    parser.add_argument(
        "--src",
        type=str,
        default=str(CELEBA_SRC),
        help="CelebAMask-HQ root directory",
    )
    parser.add_argument(
        "--dst",
        type=str,
        default=str(BENCHMARK_DIR),
        help="Output benchmark directory",
    )
    parser.add_argument("--num", type=int, default=NUM_SAMPLES, help="Number of samples")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED, help="Random seed")
    args = parser.parse_args()

    src_root = Path(args.src)
    dst_root = Path(args.dst)

    if not src_root.is_dir():
        log.error("Source directory not found: %s", src_root)
        log.info("Expected structure: <src>/CelebA-HQ-img/, <src>/CelebAMask-HQ-mask-anno/")
        sys.exit(1)

    img_dir = src_root / "CelebA-HQ-img"
    mask_dir = src_root / "CelebAMask-HQ-mask-anno"
    attr_file = src_root / "CelebAMask-HQ-attribute-anno.txt"

    if not img_dir.is_dir():
        log.error("Images directory not found: %s", img_dir)
        sys.exit(1)
    if not mask_dir.is_dir():
        log.error("Masks directory not found: %s", mask_dir)
        sys.exit(1)

    dst_img_dir = dst_root / "images"
    dst_mask_dir = dst_root / "masks"
    dst_img_dir.mkdir(parents=True, exist_ok=True)
    dst_mask_dir.mkdir(parents=True, exist_ok=True)

    attr_names: list[str] = []
    all_attrs: dict[int, dict[str, int]] = {}
    if attr_file.is_file():
        attr_names, all_attrs = _parse_attributes(attr_file)
        log.info("Loaded %d attributes for %d images", len(attr_names), len(all_attrs))
    else:
        log.warning("Attribute file not found: %s", attr_file)

    random.seed(args.seed)
    all_ids = list(range(30000))
    selected = sorted(random.sample(all_ids, min(args.num, len(all_ids))))

    log.info("Selected %d images from CelebAMask-HQ", len(selected))

    records: list[dict[str, str | int]] = []
    for img_id in tqdm(selected, desc="Copying images and masks"):
        src_img = img_dir / f"{img_id}.jpg"
        dst_img = dst_img_dir / f"{img_id}.jpg"

        if not src_img.exists():
            log.warning("Image %d not found at %s, skipping", img_id, src_img)
            continue

        shutil.copy2(str(src_img), str(dst_img))

        mask_files = _collect_mask_files(mask_dir, img_id)
        copied_masks: list[str] = []
        for mf in mask_files:
            shutil.copy2(str(mf), str(dst_mask_dir / mf.name))
            copied_masks.append(mf.name)

        record: dict[str, str | int] = {
            "image_id": img_id,
            "filename": f"{img_id}.jpg",
            "mask_count": len(copied_masks),
            "mask_files": ";".join(copied_masks),
        }

        attrs = all_attrs.get(img_id, {})
        for name in attr_names:
            record[name] = attrs.get(name, "")

        records.append(record)

    csv_path = dst_root / "ground_truth.csv"
    fieldnames = ["image_id", "filename", "mask_count", "mask_files"] + attr_names
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)  # type: ignore[arg-type]
        writer.writeheader()
        writer.writerows(records)  # type: ignore[arg-type]

    log.info("Wrote %d records to %s", len(records), csv_path)
    log.info("Benchmark dataset created at %s", dst_root)
    log.info("  Images: %s (%d files)", dst_img_dir, len(records))
    log.info("  Masks:  %s", dst_mask_dir)


if __name__ == "__main__":
    main()
