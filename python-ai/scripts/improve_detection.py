#!/usr/bin/env python3
"""Benchmark face detection improvements end-to-end.

Runs the evaluation pipeline multiple times with different
:class:`FaceDetectionConfig` presets and produces a before/after
comparison HTML report.

Usage:
    # Full comparison (all presets, 500 images each — takes hours)
    python scripts/improve_detection.py

    # Quick test with a reduced set and single preset
    python scripts/improve_detection.py --limit 50 --quick

    # Compare two specific config variants
    python scripts/improve_detection.py --presets original,aggressive
"""

import argparse
import csv
import json
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from loguru import logger
from tqdm import tqdm

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.config.face_detection import FaceDetectionConfig
from app.services.pipeline_service import PipelineService

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")

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
    "detection_strategy",
    "detection_size",
    "detection_threshold",
    "face_width",
    "face_height",
    "total_faces_detected",
]


# ---------------------------------------------------------------------------
# Config presets
# ---------------------------------------------------------------------------

PRESETS: dict[str, FaceDetectionConfig] = {
    "original": FaceDetectionConfig.PRESET_ORIGINAL,
    "aggressive": FaceDetectionConfig.PRESET_AGGRESSIVE,
    "max_recall": FaceDetectionConfig.PRESET_MAX_RECALL,
}

# ---------------------------------------------------------------------------
# Image list
# ---------------------------------------------------------------------------


def _load_image_list(benchmark_dir: Path, limit: int | None) -> list[dict[str, str]]:
    gt_csv = benchmark_dir / "ground_truth.csv"
    if not gt_csv.exists():
        logger.error("ground_truth.csv not found in {}", benchmark_dir)
        sys.exit(1)
    with open(gt_csv, newline="", encoding="utf-8") as f:
        images = list(csv.DictReader(f))
    if limit is not None:
        images = images[:limit]
    logger.info("Loaded {} images from {}", len(images), gt_csv)
    return images


# ---------------------------------------------------------------------------
# Per-image processing
# ---------------------------------------------------------------------------


def _process_image(
    pipe: PipelineService,
    img_path: Path,
    filename: str,
    config_name: str,
    config: FaceDetectionConfig,
) -> dict[str, Any]:
    """Process a single image and return a detailed record."""
    start = time.time()
    error: str | None = None
    record: dict[str, Any] = {
        "filename": filename,
        "status": "error",
        "error": None,
        "face_detected": False,
        "parsing_success": False,
        "face_confidence": 0.0,
        "processing_time": 0.0,
        "skin_tone": "",
        "skin_health": "",
        "face_shape": "",
        "detection_strategy": config_name,
        "detection_size": str(config.detection_size),
        "detection_threshold": str(config.detection_threshold),
        "face_width": 0,
        "face_height": 0,
        "total_faces_detected": 0,
    }

    try:
        result = pipe.analyze_from_file(str(img_path))
        elapsed = time.time() - start

        face = result.get("face", {})
        parsing = result.get("parsing", {})
        skin_tone = result.get("skin_tone", {})
        skin = result.get("skin_analysis", {})
        shape = result.get("shape", {})

        record["status"] = "success"
        record["face_detected"] = face.get("detected", False)
        record["parsing_success"] = bool(parsing)
        record["face_confidence"] = face.get("confidence", 0.0)
        record["skin_tone"] = skin_tone.get("fitzpatrick", "")
        record["skin_health"] = skin.get("overall_skin_health", "")
        record["face_shape"] = shape.get("type", "")
        record["processing_time"] = round(elapsed, 3)

        face_size = face.get("size", {})
        record["face_width"] = face_size.get("width", 0)
        record["face_height"] = face_size.get("height", 0)
        record["detection_strategy"] = "original"  # Will be overridden if available

        logger.info("OK {} — {:.2f}s — conf={}", filename, elapsed, face.get("confidence", 0))

    except Exception as exc:
        elapsed = time.time() - start
        error = str(exc)
        record["status"] = "error"
        record["error"] = error
        record["processing_time"] = round(elapsed, 3)
        logger.info("FAIL {} — {} ({:.2f}s)", filename, error, elapsed)

    return record


def _summarise(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute aggregate statistics from evaluation records."""
    total = len(records)
    success = [r for r in records if r["status"] == "success"]
    errors = [r for r in records if r["status"] == "error"]
    n_success = len(success)
    n_error = len(errors)

    success_times = [r["processing_time"] for r in success]
    error_times = [r["processing_time"] for r in errors]

    confidence_vals = [r["face_confidence"] for r in success if r["face_confidence"] > 0]

    error_counter: Counter = Counter()
    for r in errors:
        error_counter[r.get("error", "Unknown")] += 1

    face_areas = [(r["face_width"], r["face_height"]) for r in success if r["face_width"] > 0]
    avg_face_area = (
        np.mean([w * h for w, h in face_areas]) if face_areas else 0
    )

    return {
        "total": total,
        "success": n_success,
        "error": n_error,
        "success_rate": n_success / total * 100 if total else 0,
        "error_rate": n_error / total * 100 if total else 0,
        "avg_success_time": np.mean(success_times) if success_times else 0,
        "avg_error_time": np.mean(error_times) if error_times else 0,
        "total_time": sum(success_times) + sum(error_times),
        "avg_confidence": np.mean(confidence_vals) if confidence_vals else 0,
        "min_confidence": min(confidence_vals) if confidence_vals else 0,
        "max_confidence": max(confidence_vals) if confidence_vals else 0,
        "avg_face_area": avg_face_area,
        "error_breakdown": dict(error_counter.most_common()),
    }


# ---------------------------------------------------------------------------
# HTML report
# ---------------------------------------------------------------------------


def _build_html_report(
    results: dict[str, tuple[list[dict[str, Any]], dict[str, Any]]],
) -> str:
    """Build a self-contained HTML comparison report."""
    now = datetime.now().isoformat()

    preset_names = list(results.keys())
    summaries = [results[p][1] for p in preset_names]

    # Summary cards
    cards_html = ""
    for name, (_, s) in results.items():
        color = "ok" if s["success_rate"] >= 80 else ("warn" if s["success_rate"] >= 50 else "danger")
        cards_html += f"""
<div class='card {color}'>
  <h3>{name}</h3>
  <div class='stat-row'><span>Success</span><span>{s['success']}/{s['total']} ({s['success_rate']:.1f}%)</span></div>
  <div class='stat-row'><span>Avg conf</span><span>{s['avg_confidence']:.3f}</span></div>
  <div class='stat-row'><span>Avg time</span><span>{s['avg_success_time']:.2f}s</span></div>
  <div class='stat-row'><span>Avg face area</span><span>{s['avg_face_area']:.0f} px²</span></div>
</div>"""

    # Comparison table
    baseline = summaries[0]
    table_rows = ""
    for name, s in zip(preset_names, summaries):
        delta_success = s["success_rate"] - baseline["success_rate"]
        delta_conf = s["avg_confidence"] - baseline["avg_confidence"]
        delta_time = s["avg_success_time"] - baseline["avg_success_time"]
        arrow = "▲" if delta_success > 0 else "▼" if delta_success < 0 else "—"
        table_rows += f"""<tr>
  <td>{name}</td>
  <td>{s['success_rate']:.1f}%</td>
  <td class='{'green' if delta_success > 0 else 'red' if delta_success < 0 else ''}'>{arrow} {delta_success:+.1f}%</td>
  <td>{s['avg_confidence']:.3f}</td>
  <td class='{'green' if delta_conf > 0 else 'red' if delta_conf < 0 else ''}'>{delta_conf:+.4f}</td>
  <td>{s['avg_success_time']:.2f}s</td>
  <td class='{'green' if delta_time < 1 else 'red'}'>{delta_time:+.2f}s</td>
  <td>{s['avg_face_area']:.0f}</td>
</tr>"""

    # Error breakdown per preset
    error_sections = ""
    for name, (_, s) in results.items():
        errs = s.get("error_breakdown", {})
        if not errs:
            continue
        err_rows = ""
        for err_msg, count in errs.items():
            err_rows += f"<tr><td>{err_msg[:100]}</td><td>{count}</td></tr>\n"
        error_sections += f"""
<div class='section'>
  <h3>{name} — Error breakdown ({s['error']} total)</h3>
  <table><tr><th>Error</th><th>Count</th></tr>{err_rows}</table>
</div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GlamAI — Face Detection Comparison Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f4f6f9; color: #1a1a2e; padding: 2rem; line-height: 1.6;
  }}
  .container {{ max-width: 1200px; margin: 0 auto; }}
  h1 {{ font-size: 1.8rem; margin-bottom: 0.25rem; color: #16213e; }}
  .subtitle {{ color: #666; margin-bottom: 2rem; font-size: 0.95rem; }}

  .card-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
  .card {{ background: #fff; border-radius: 10px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .card h3 {{ font-size: 1rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; }}
  .card.ok {{ border-top: 3px solid #27ae60; }}
  .card.warn {{ border-top: 3px solid #f39c12; }}
  .card.danger {{ border-top: 3px solid #e74c3c; }}
  .stat-row {{ display: flex; justify-content: space-between; padding: 0.2rem 0; font-size: 0.85rem; }}

  table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1.5rem; }}
  th, td {{ padding: 0.5rem 0.8rem; text-align: left; font-size: 0.85rem; }}
  th {{ background: #16213e; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }}
  tr:nth-child(even) {{ background: #f9f9fb; }}
  .green {{ color: #27ae60; font-weight: 600; }}
  .red {{ color: #e74c3c; font-weight: 600; }}

  .section {{ margin-bottom: 1.5rem; }}
  .section h3 {{ font-size: 1rem; margin-bottom: 0.5rem; }}

  .charts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }}
  .chart-card {{ background: #fff; border-radius: 10px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}

  .recommendation {{ background: #eaf7ea; border-left: 4px solid #27ae60; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 1rem; }}
  .recommendation h3 {{ margin-bottom: 0.5rem; }}
</style>
</head>
<body>
<div class="container">

<h1>Face Detection — Before / After Comparison</h1>
<p class="subtitle">Generated {now} &middot; {summaries[0]['total']} images per preset &middot; {len(preset_names)} preset(s)</p>

<div class="card-grid">
{cards_html}
</div>

<div class="section">
  <h2>Cross-Preset Comparison <small>(baseline: <strong>{preset_names[0]}</strong>)</small></h2>
  <table>
    <tr>
      <th>Preset</th>
      <th>Success Rate</th>
      <th>Δ vs baseline</th>
      <th>Avg Confidence</th>
      <th>Δ vs baseline</th>
      <th>Avg Time</th>
      <th>Δ vs baseline</th>
      <th>Avg Face Area</th>
    </tr>
    {table_rows}
  </table>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>Success Rate</h3>
    <canvas id="successChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>Avg Confidence</h3>
    <canvas id="confidenceChart"></canvas>
  </div>
</div>

{error_sections}

<div class="section">
  <h2>Improvement Recommendations</h2>
  <div class="recommendation">
    <h3>Next steps</h3>
    <ol>
      <li><strong>Review the best-performing preset</strong> and make it the new default.</li>
      <li>If the margin between presets is small, prefer the <em>fastest</em> one for production.</li>
      <li>Run a stratified analysis: group failures by CelebA attribute (Eyeglasses, Male, Young, etc.) to identify systematic biases.</li>
      <li>Consider GPU inference (set <code>ctx_id=0</code> in the provider) if inference time is a bottleneck.</li>
      <li>Add custom preprocessing for extreme cases: very dark images, heavy occlusions, or extreme yaw/pitch.</li>
    </ol>
  </div>
</div>

</div>

<script>
  const successCtx = document.getElementById('successChart').getContext('2d');
  new Chart(successCtx, {{
    type: 'bar',
    data: {{
      labels: {json.dumps(preset_names)},
      datasets: [{{
        label: 'Success rate (%)',
        data: {json.dumps([s['success_rate'] for s in summaries])},
        backgroundColor: {json.dumps(['#27ae60' if s['success_rate'] >= 80 else '#f39c12' if s['success_rate'] >= 50 else '#e74c3c' for s in summaries])},
        borderRadius: 4
      }}]
    }},
    options: {{
      responsive: true,
      scales: {{ y: {{ beginAtZero: true, max: 100, ticks: {{ suffix: '%' }} }} }},
      plugins: {{ legend: {{ display: false }} }}
    }}
  }});

  const confCtx = document.getElementById('confidenceChart').getContext('2d');
  new Chart(confCtx, {{
    type: 'bar',
    data: {{
      labels: {json.dumps(preset_names)},
      datasets: [{{
        label: 'Avg detection confidence',
        data: {json.dumps([s['avg_confidence'] for s in summaries])},
        backgroundColor: ['#3498db', '#9b59b6', '#1abc9c'],
        borderRadius: 4
      }}]
    }},
    options: {{
      responsive: true,
      scales: {{ y: {{ beginAtZero: true, max: 1.0 }} }},
      plugins: {{ legend: {{ display: false }} }}
    }}
  }});
</script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark face detection improvements")
    parser.add_argument("--benchmark", type=str, default=str(BENCHMARK_DIR))
    parser.add_argument("--limit", type=int, default=None, help="Images to process per preset")
    parser.add_argument(
        "--presets",
        type=str,
        default="original,aggressive",
        help="Comma-separated preset names to compare",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory for results (default: benchmark_dir/comparison)",
    )
    args = parser.parse_args()

    benchmark_dir = Path(args.benchmark)
    images = _load_image_list(benchmark_dir, args.limit)
    preset_names = [n.strip() for n in args.presets.split(",")]
    output_dir = Path(args.output) if args.output else benchmark_dir / "comparison"
    output_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, tuple[list[dict[str, Any]], dict[str, Any]]] = {}

    for preset_name in preset_names:
        if preset_name not in PRESETS:
            logger.warning("Unknown preset '{}', skipping. Available: {}", preset_name, list(PRESETS.keys()))
            continue

        config = PRESETS[preset_name]
        logger.info("=" * 60)
        logger.info("Running preset: {} — det_size={}, det_thresh={}",
                      preset_name, config.detection_size, config.detection_threshold)

        run_dir = output_dir / preset_name
        run_dir.mkdir(parents=True, exist_ok=True)
        pipe = PipelineService(face_config=config)

        records: list[dict[str, Any]] = []
        for entry in tqdm(images, desc=f"  {preset_name}", unit="img"):
            filename = entry["filename"]
            img_path = benchmark_dir / "images" / filename
            if not img_path.exists():
                logger.warning("File not found: {}", img_path)
                continue
            record = _process_image(pipe, img_path, filename, preset_name, config)
            records.append(record)

        summary = _summarise(records)
        results[preset_name] = (records, summary)

        # Write per-preset CSV
        csv_path = run_dir / "evaluation_summary.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=RECORD_FIELDS)
            writer.writeheader()
            writer.writerows(records)
        logger.info("Wrote {} records to {}", len(records), csv_path)

        # Log summary
        logger.info("  Success: {}/{} ({:.1f}%) | Avg conf: {:.3f} | Avg time: {:.2f}s",
                     summary["success"], summary["total"],
                     summary["success_rate"], summary["avg_confidence"],
                     summary["avg_success_time"])

    # Generate comparison report
    if len(results) >= 2:
        report_html = _build_html_report(results)
        report_path = output_dir / "comparison_report.html"
        report_path.write_text(report_html, encoding="utf-8")
        logger.info("Comparison report written to {}", report_path)

    # Print final comparison
    logger.info("=" * 60)
    logger.info("FINAL COMPARISON")
    for name, (_, s) in results.items():
        logger.info("  %-15s  %3d/%3d (%5.1f%%)  conf=%.3f  avg_time=%.2fs",
                     name, s["success"], s["total"], s["success_rate"],
                     s["avg_confidence"], s["avg_success_time"])
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
