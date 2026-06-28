#!/usr/bin/env python3
"""Evaluate the GlamAI beauty analysis pipeline on a benchmark dataset.

For every image:
  1. Load the image from disk
  2. Call the analysis pipeline directly (not via HTTP)
  3. Save full JSON prediction
  4. Save debug visualizations
  5. Continue on failure — log and move on

Supports resume (skips images with existing result JSON), configurable
parallelism, and produces an evaluation summary CSV for downstream
report generation.

Usage:
    python scripts/evaluate_dataset.py
    python scripts/evaluate_dataset.py --workers 4
    python scripts/evaluate_dataset.py --limit 50 --resume
    python scripts/evaluate_dataset.py --images 0.jpg,1.jpg,2.jpg
"""

import argparse
import csv
import json
import logging
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm

# Ensure the project root is on sys.path so that ``from app import …`` works.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.services.pipeline_service import PipelineService
from app.utils.image import validate_image, convert_to_numpy

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(_PROJECT_ROOT / "evaluation.log"), mode="a"),
        logging.StreamHandler(sys.stderr),
    ],
)
log = logging.getLogger("evaluate")

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")

# Evaluation record fieldnames (also used for the summary CSV).
RECORD_FIELDS = [
    "filename",
    "status",
    "error",
    "face_detected",
    "parsing_success",
    "face_confidence",
    "processing_time",
    "skin_tone",
    "skin_health",
    "face_shape",
]


# ---------------------------------------------------------------------------
# Debug helpers
# ---------------------------------------------------------------------------


def _draw_debug(image: np.ndarray, result: dict) -> np.ndarray:
    """Annotate the image with face bounding box and key landmarks."""
    debug = image.copy()
    face = result.get("face", {})
    if face.get("detected"):
        bbox = face.get("bounding_box", [])
        if len(bbox) == 4:
            x1, y1, x2, y2 = [int(v) for v in bbox]
            cv2.rectangle(debug, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                debug,
                f"face {face.get('confidence', 0):.2f}",
                (x1, max(y1 - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                1,
            )
    shape_label = result.get("shape", {}).get("type", "")
    if shape_label:
        cv2.putText(
            debug,
            f"shape: {shape_label}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
        )
    return debug


def _make_parsing_overlay(image: np.ndarray) -> np.ndarray:
    """Create a simple overlay showing that parsing was applied."""
    overlay = image.copy()
    cv2.putText(
        overlay,
        "Parsing: see predictions JSON",
        (10, image.shape[0] - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (200, 200, 200),
        1,
    )
    return overlay


# ---------------------------------------------------------------------------
# Core processing
# ---------------------------------------------------------------------------


def _build_record(
    filename: str,
    status: str = "error",
    error: str | None = None,
    result: dict | None = None,
    processing_time: float = 0.0,
) -> dict:
    """Build a standardised evaluation record dict."""
    record: dict = {
        "filename": filename,
        "status": status,
        "error": error,
        "face_detected": False,
        "parsing_success": False,
        "face_confidence": 0.0,
        "processing_time": round(processing_time, 3),
        "skin_tone": "",
        "skin_health": "",
        "face_shape": "",
    }
    if result is not None:
        face = result.get("face", {})
        parsing = result.get("parsing", {})
        skin_tone = result.get("skin_tone", {})
        skin = result.get("skin_analysis", {})
        shape = result.get("shape", {})
        record["face_detected"] = face.get("detected", False)
        record["parsing_success"] = bool(parsing)
        record["face_confidence"] = face.get("confidence", 0.0)
        record["skin_tone"] = skin_tone.get("fitzpatrick", "")
        record["skin_health"] = skin.get("overall_skin_health", "")
        record["face_shape"] = shape.get("type", "")
    return record


def _process_one(
    pipe: PipelineService,
    img_path: Path,
    filename: str,
    results_dir: Path,
    debug_dir: Path,
) -> dict:
    """Process a single image and return an evaluation record.

    If the result JSON already exists the image is skipped (resume).
    """
    result_json = results_dir / f"{Path(filename).stem}.json"

    if result_json.exists():
        return _build_record(filename, status="skipped")

    start = time.time()
    try:
        content = img_path.read_bytes()
        validate_image(content, filename)
        image = convert_to_numpy(content)

        result = pipe.analyze_from_file(str(img_path))
        elapsed = time.time() - start

        result_json.parent.mkdir(parents=True, exist_ok=True)
        with open(result_json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, default=str)

        stem = Path(filename).stem
        debug_img = _draw_debug(image, result)
        cv2.imwrite(str(debug_dir / f"{stem}_debug.jpg"), debug_img)

        parsing_img = _make_parsing_overlay(image)
        cv2.imwrite(str(debug_dir / f"{stem}_parsing.jpg"), parsing_img)

        log.info("OK %s — %.2fs", filename, elapsed)
        return _build_record(
            filename=filename,
            status="success",
            result=result,
            processing_time=elapsed,
        )

    except Exception as exc:
        elapsed = time.time() - start
        log.error("FAIL %s — %s", filename, exc)
        return _build_record(
            filename=filename,
            status="error",
            error=str(exc),
            processing_time=elapsed,
        )


def _worker_process(args: tuple) -> dict:
    """Top-level worker function for multiprocessing.

    Each worker creates its own PipelineService instance (models are
    loaded lazily and independently per process).
    """
    img_path_str, filename, results_dir_str, debug_dir_str = args
    img_path = Path(img_path_str)
    results_dir = Path(results_dir_str)
    debug_dir = Path(debug_dir_str)
    pipe = PipelineService()
    return _process_one(pipe, img_path, filename, results_dir, debug_dir)


# ---------------------------------------------------------------------------
# Sequential processing
# ---------------------------------------------------------------------------


def _run_sequential(
    images: list[dict],
    benchmark_dir: Path,
    results_dir: Path,
    debug_dir: Path,
) -> list[dict]:
    """Process images one at a time in the current process."""
    pipe = PipelineService()
    records: list[dict] = []
    for entry in tqdm(images, desc="Evaluating", unit="img"):
        filename = entry["filename"]
        img_path = benchmark_dir / "images" / filename
        if not img_path.exists():
            log.warning("File not found: %s", img_path)
            records.append(_build_record(filename, status="error", error="File not found"))
            continue
        records.append(_process_one(pipe, img_path, filename, results_dir, debug_dir))
    return records


# ---------------------------------------------------------------------------
# Parallel processing (multiprocessing)
# ---------------------------------------------------------------------------


def _run_parallel(
    images: list[dict],
    benchmark_dir: Path,
    results_dir: Path,
    debug_dir: Path,
    workers: int,
) -> list[dict]:
    """Process images in parallel using a process pool."""
    results_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    tasks: list[tuple] = []
    for entry in images:
        filename = entry["filename"]
        img_path = benchmark_dir / "images" / filename
        if not img_path.exists():
            continue
        tasks.append((str(img_path), filename, str(results_dir), str(debug_dir)))

    records: list[dict] = []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_worker_process, t): t[1] for t in tasks}
        for future in tqdm(as_completed(futures), total=len(tasks), desc="Evaluating", unit="img"):
            filename = futures[future]
            try:
                record = future.result()
            except Exception as exc:
                record = _build_record(filename, status="error", error=str(exc))
            records.append(record)

    return records


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate GlamAI pipeline on benchmark dataset")
    parser.add_argument(
        "--benchmark",
        type=str,
        default=str(BENCHMARK_DIR),
        help="Benchmark dataset root directory",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of parallel worker processes (1 = sequential)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process at most N images (useful for testing)",
    )
    parser.add_argument(
        "--images",
        type=str,
        default=None,
        help="Comma-separated list of specific filenames or image IDs to process",
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        help="Re-process images even if result JSON already exists",
    )
    args = parser.parse_args()

    benchmark_dir = Path(args.benchmark)
    if not benchmark_dir.is_dir():
        log.error("Benchmark directory not found: %s", benchmark_dir)
        sys.exit(1)

    gt_csv = benchmark_dir / "ground_truth.csv"
    if not gt_csv.exists():
        log.error("ground_truth.csv not found in %s", benchmark_dir)
        sys.exit(1)

    with open(gt_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        images: list[dict] = list(reader)

    log.info("Loaded %d records from %s", len(images), gt_csv)

    # Filter for specific images
    if args.images:
        target = {x.strip() for x in args.images.split(",")}
        images = [
            img
            for img in images
            if img["filename"] in target or img.get("image_id", "") in target
        ]
        log.info("Filtered to %d specific images", len(images))

    # Apply limit
    if args.limit is not None:
        images = images[: args.limit]
        log.info("Limited to first %d images", args.limit)

    if not images:
        log.warning("No images to process")
        return

    results_dir = benchmark_dir / "results"
    debug_dir = benchmark_dir / "debug"
    results_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    # Remove existing result JSONs if --no-resume
    if args.no_resume:
        log.info("Removing existing results (--no-resume)")
        for f in results_dir.glob("*.json"):
            f.unlink()

    # Process
    log.info(
        "Processing %d images with %d worker(s) ...",
        len(images),
        args.workers,
    )
    if args.workers > 1:
        records = _run_parallel(images, benchmark_dir, results_dir, debug_dir, args.workers)
    else:
        records = _run_sequential(images, benchmark_dir, results_dir, debug_dir)

    # Write summary CSV
    summary_path = benchmark_dir / "evaluation_summary.csv"
    with open(summary_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=RECORD_FIELDS)  # type: ignore[arg-type]
        writer.writeheader()
        writer.writerows(records)  # type: ignore[arg-type]

    log.info("Summary written to %s", summary_path)

    # Print final stats
    total = len(records)
    success = sum(1 for r in records if r["status"] == "success")
    skipped = sum(1 for r in records if r["status"] == "skipped")
    errors = sum(1 for r in records if r["status"] == "error")
    total_time = sum(float(r.get("processing_time", 0)) for r in records)

    log.info("=" * 50)
    log.info("Evaluation complete")
    log.info("  Total     %d", total)
    log.info("  Success   %d", success)
    log.info("  Skipped   %d", skipped)
    log.info("  Errors    %d", errors)
    log.info("  Time      %.2f s total  |  %.3f s avg per image", total_time, total_time / max(total, 1))
    log.info("=" * 50)


if __name__ == "__main__":
    main()
