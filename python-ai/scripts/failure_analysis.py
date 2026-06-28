#!/usr/bin/env python3
"""Failure analysis for the GlamAI benchmark evaluation.

Groups failed images by root cause, copies them into categorized
folders, generates summary statistics with improvement
recommendations, and produces a visual contact sheet (grid montage)
of failed images for quick manual inspection.

Usage:
    python scripts/failure_analysis.py
    python scripts/failure_analysis.py --benchmark D:/Data/GlamAI-Benchmark
    python scripts/failure_analysis.py --grid-cols 10 --grid-rows 10
"""

import argparse
import csv
import json
import logging
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(Path(__file__).resolve().parent / "failure_analysis.log"), mode="a"),
        logging.StreamHandler(sys.stderr),
    ],
)
log = logging.getLogger("failure_analysis")

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")

# ---------------------------------------------------------------------------
# Failure categorisation
# ---------------------------------------------------------------------------


def _classify_error(error: str) -> tuple[str, str]:
    """Classify an error message into a category key and human label.

    Returns:
        (category_key, human_readable_label)
    """
    if not error:
        return ("unknown", "Unknown error")

    if "No face detected" in error:
        return ("no_face_detected", "No face detected")
    if "Multiple faces detected" in error:
        return ("multiple_faces", "Multiple faces detected")
    if "landmark" in error.lower() or "face mesh" in error.lower():
        return ("landmark_failure", "Landmark/face-mesh failure")
    if "parsing" in error.lower() or "segmentation" in error.lower():
        return ("parsing_failure", "Face-parsing failure")
    if "quality" in error.lower():
        return ("quality_failure", "Quality check failure")
    if "validate" in error.lower() or "extension" in error.lower() or "corrupt" in error.lower():
        return ("validation_failure", "Image validation failure")
    if "skin" in error.lower():
        return ("skin_analysis_failure", "Skin analysis failure")
    if "shape" in error.lower() or "geometry" in error.lower():
        return ("geometry_failure", "Geometry/shape failure")
    if "timeout" in error.lower():
        return ("timeout", "Processing timeout")
    if "memory" in error.lower():
        return ("memory", "Out of memory")

    return ("other", f"Other: {error[:80]}")


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def _load_summary(summary_path: Path) -> list[dict]:
    """Load the evaluation summary CSV."""
    if not summary_path.exists():
        log.error("Summary CSV not found: %s", summary_path)
        sys.exit(1)
    with open(summary_path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------------------
# Contact sheet generation
# ---------------------------------------------------------------------------


def _make_contact_sheet(
    image_paths: list[Path],
    output_path: Path,
    cols: int = 10,
    rows: int = 10,
    thumb_size: tuple[int, int] = (224, 224),
) -> None:
    """Create a grid montage of failed images for visual inspection.

    Args:
        image_paths: List of paths to source images.
        output_path: Where to write the montage image.
        cols: Number of columns in the grid.
        rows: Number of rows in the grid.
        thumb_size: (width, height) for each thumbnail.
    """
    if not image_paths:
        log.warning("No images to include in contact sheet")
        return

    n_slots = cols * rows
    selected = image_paths[:n_slots]
    grid_w = cols * thumb_size[0]
    grid_h = rows * thumb_size[1]
    canvas = np.ones((grid_h, grid_w, 3), dtype=np.uint8) * 32

    for idx, img_path in enumerate(selected):
        if idx >= n_slots:
            break
        r, c = divmod(idx, cols)
        x = c * thumb_size[0]
        y = r * thumb_size[1]

        tile = canvas[y : y + thumb_size[1], x : x + thumb_size[0]]

        try:
            img = cv2.imread(str(img_path))
            if img is None:
                raise FileNotFoundError
            thumb = cv2.resize(img, thumb_size, interpolation=cv2.INTER_AREA)
        except Exception:
            thumb = np.full((*thumb_size[::-1], 3), 64, dtype=np.uint8)
            cv2.putText(
                thumb, "ERR", (40, 112), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2,
            )

        tile[:] = thumb

        # Label with filename
        label = img_path.stem
        cv2.putText(
            tile, label, (4, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1,
        )

    cv2.imwrite(str(output_path), canvas)
    log.info("Contact sheet (%dx%d) written to %s", cols, rows, output_path)


# ---------------------------------------------------------------------------
# HTML report
# ---------------------------------------------------------------------------


def _build_html_report(
    category_counts: dict[str, int],
    category_labels: dict[str, str],
    failed_by_cat: dict[str, list[dict]],
    n_total: int,
    n_success: int,
    n_failed: int,
    metrics_csv_rows: list[dict],
    recommendations: list[str],
    contact_sheets: dict[str, str],
) -> str:
    """Build a self-contained HTML failure analysis report."""
    now = datetime.now().isoformat()

    success_rate = (n_success / n_total * 100) if n_total else 0.0
    failure_rate = (n_failed / n_total * 100) if n_total else 0.0

    # Category table rows
    cat_rows = ""
    for key in sorted(category_counts, key=category_counts.get, reverse=True):
        count = category_counts[key]
        label = category_labels.get(key, key)
        pct = count / n_failed * 100 if n_failed else 0.0
        cat_rows += (
            f"<tr><td>{label}</td><td>{count}</td>"
            f"<td>{pct:.1f}%</td>"
            f"<td><a href='#cat-{key}'>details</a></td></tr>\n"
        )

    # Contact sheets section
    cs_section = ""
    for key, img_rel in sorted(contact_sheets.items()):
        label = category_labels.get(key, key)
        cs_section += f"""
<div class='section' id='cat-{key}'>
  <h2>{label} ({category_counts.get(key, 0)} images)</h2>
  <img src='{img_rel}' alt='{label} contact sheet' style='max-width:100%;border:1px solid #ddd;border-radius:6px;'>
</div>
"""

    # Per-category per-image tables (first 20 per category)
    cat_details = ""
    for key in sorted(category_counts, key=category_counts.get, reverse=True):
        images = failed_by_cat.get(key, [])
        if not images:
            continue
        label = category_labels.get(key, key)
        rows_html = ""
        for rec in images[:20]:
            fn = rec.get("filename", "?")
            err = rec.get("error", "?")
            pt = rec.get("processing_time", "?")
            rows_html += f"<tr><td>{fn}</td><td>{err}</td><td>{pt}s</td></tr>\n"
        more = f"<tr><td colspan='3'>... and {len(images) - 20} more</td></tr>\n" if len(images) > 20 else ""
        cat_details += f"""
<div class='section'>
  <h3>{label} ({len(images)} images)</h3>
  <table><tr><th>Filename</th><th>Error</th><th>Time (s)</th></tr>
  {rows_html}{more}</table>
</div>
"""

    # Metrics table
    metrics_rows = ""
    for row in metrics_csv_rows:
        metrics_rows += f"<tr><td>{row['metric']}</td><td>{row['value']}</td></tr>\n"

    # Recommendations
    recs_html = "<ol>\n" + "".join(f"  <li>{r}</li>\n" for r in recommendations) + "</ol>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GlamAI — Failure Analysis Report</title>
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
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
  .summary-card {{ background: #fff; border-radius: 10px; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .summary-card .value {{ font-size: 2rem; font-weight: 700; color: #16213e; }}
  .summary-card .label {{ font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }}
  .summary-card.danger .value {{ color: #e74c3c; }}
  .summary-card.warn .value {{ color: #f39c12; }}
  .summary-card.ok .value {{ color: #27ae60; }}
  .section {{ margin-bottom: 2rem; }}
  .section h2 {{ font-size: 1.2rem; margin-bottom: 0.75rem; color: #16213e; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.4rem; }}
  .section h3 {{ font-size: 1rem; margin-bottom: 0.5rem; color: #333; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1rem; }}
  th, td {{ padding: 0.5rem 0.8rem; text-align: left; font-size: 0.85rem; }}
  th {{ background: #16213e; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }}
  tr:nth-child(even) {{ background: #f9f9fb; }}
  .charts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }}
  .chart-card {{ background: #fff; border-radius: 10px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .chart-card canvas {{ max-height: 260px; }}
  .recommendations {{ background: #eaf7ea; border-left: 4px solid #27ae60; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; }}
  .recommendations li {{ margin-bottom: 0.5rem; }}
  img {{ max-width: 100%; height: auto; }}
</style>
</head>
<body>
<div class="container">

<h1>GlamAI — Failure Analysis Report</h1>
<p class="subtitle">Generated {now} &middot; {n_total} benchmark images</p>

<div class="summary-grid">
  <div class="summary-card"><div class="value">{n_total}</div><div class="label">Total Images</div></div>
  <div class="summary-card ok"><div class="value">{n_success}</div><div class="label">Passed</div></div>
  <div class="summary-card danger"><div class="value">{n_failed}</div><div class="label">Failed</div></div>
  <div class="summary-card warn"><div class="value">{success_rate:.1f}%</div><div class="label">Success Rate</div></div>
  <div class="summary-card danger"><div class="value">{failure_rate:.1f}%</div><div class="label">Failure Rate</div></div>
</div>

<div class="section">
  <h2>Failure Breakdown by Root Cause</h2>
  <table>
    <tr><th>Category</th><th>Count</th><th>% of Failures</th><th></th></tr>
    {cat_rows}
  </table>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>Pass / Fail</h3>
    <canvas id="passFailChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>Failure Categories</h3>
    <canvas id="categoryChart"></canvas>
  </div>
</div>

<div class="section">
  <h2>Detailed Metrics</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    {metrics_rows}
  </table>
</div>

<div class="section">
  <h2>Improvement Recommendations</h2>
  <div class="recommendations">
    {recs_html}
  </div>
</div>

{cat_details}

{cs_section}

</div>

<script>
  const pfc = document.getElementById('passFailChart').getContext('2d');
  new Chart(pfc, {{
    type: 'doughnut',
    data: {{
      labels: ['Passed ({n_success})', 'Failed ({n_failed})'],
      datasets: [{{ data: [{n_success}, {n_failed}], backgroundColor: ['#27ae60', '#e74c3c'], borderWidth: 0 }}]
    }},
    options: {{ responsive: true, plugins: {{ legend: {{ position: 'bottom' }} }} }}
  }});

  const cc = document.getElementById('categoryChart').getContext('2d');
  new Chart(cc, {{
    type: 'bar',
    data: {{
      labels: {json.dumps([category_labels.get(k, k) for k in sorted(category_counts, key=category_counts.get, reverse=True)])},
      datasets: [{{
        label: 'Failed images',
        data: {json.dumps([category_counts[k] for k in sorted(category_counts, key=category_counts.get, reverse=True)])},
        backgroundColor: ['#e74c3c','#f39c12','#9b59b6','#3498db','#1abc9c','#e67e22','#2c3e50','#7f8c8d'],
        borderRadius: 4,
      }}]
    }},
    options: {{
      responsive: true,
      indexAxis: 'y',
      plugins: {{ legend: {{ display: false }} }},
      scales: {{ x: {{ beginAtZero: true, ticks: {{ stepSize: 1 }} }} }}
    }}
  }});
</script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def _generate_recommendations(
    category_counts: dict[str, int],
    n_failed: int,
    total_processing_time: float,
    avg_success_time: float,
    avg_failure_time: float,
) -> list[str]:
    """Generate actionable improvement recommendations based on failure patterns."""
    recs: list[str] = []

    no_face = category_counts.get("no_face_detected", 0)
    multi_face = category_counts.get("multiple_faces", 0)

    if no_face > 0:
        pct = no_face / n_failed * 100 if n_failed else 0
        recs.append(
            f"<strong>Primary issue — No face detected ({no_face} images, {pct:.0f}% of failures).</strong> "
            "InsightFace's buffalo_l model failed to detect any face. This may indicate: "
            "(a) extreme head poses not covered by the training data, "
            "(b) heavy occlusions (hands, hair, accessories), "
            "(c) poor lighting or extreme shadows, or "
            "(d) non-frontal faces with yaw/pitch beyond model capacity. "
            "<strong>Recommendation:</strong> Consider switching to a more robust face detector "
            "(e.g., RetinaFace with larger input, or YOLOv8-face) and/or adding a face "
            "detection confidence threshold fallback pipeline."
        )

    if multi_face > 0:
        recs.append(
            f"<strong>Multiple faces detected ({multi_face} images).</strong> "
            "The pipeline currently raises an error if more than one face is found. "
            "<strong>Recommendation:</strong> Add a face-selection strategy that picks the "
            "largest or most centrally-located face instead of failing. Also consider "
            "adding a 'group photo' confidence check."
        )

    if n_failed > 0:
        recs.append(
            "<strong>Processing-time gap.</strong> "
            f"Failed images averaged {avg_failure_time:.2f}s vs {avg_success_time:.2f}s for successes. "
            "Failures are faster because most crash early (no face = no downstream work). "
            "This is expected but confirms the bottleneck is face detection."
        )

    recs.append(
        "<strong>Monitoring & alerting.</strong> "
        "Add per-model confidence tracking (face detection, landmark, parsing) to detect "
        "model drift over time. The benchmark should be run after every pipeline change."
    )

    recs.append(
        "<strong>Benchmark diversity.</strong> "
        "CelebAMask-HQ contains well-lit, near-frontal celebrity faces. The ~47% failure "
        "rate suggests the sample may contain challenging poses. Stratify future benchmarks "
        "by yaw angle, lighting, and occlusion level to identify specific weaknesses."
    )

    return recs


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze benchmark failures")
    parser.add_argument(
        "--benchmark", type=str, default=str(BENCHMARK_DIR), help="Benchmark dataset root",
    )
    parser.add_argument(
        "--grid-cols", type=int, default=10, help="Contact sheet columns",
    )
    parser.add_argument(
        "--grid-rows", type=int, default=10, help="Contact sheet rows",
    )
    parser.add_argument(
        "--thumb-size", type=int, default=224, help="Thumbnail size in pixels",
    )
    args = parser.parse_args()

    benchmark_dir = Path(args.benchmark)
    if not benchmark_dir.is_dir():
        log.error("Benchmark directory not found: %s", benchmark_dir)
        sys.exit(1)

    img_dir = benchmark_dir / "images"
    results_dir = benchmark_dir / "results"
    summary_path = benchmark_dir / "evaluation_summary.csv"
    failures_dir = benchmark_dir / "failures"
    contact_sheets_dir = benchmark_dir / "failures" / "contact_sheets"

    if not summary_path.exists():
        log.error("evaluation_summary.csv not found. Run evaluate_dataset.py first.")
        sys.exit(1)

    # Load data
    summary = _load_summary(summary_path)
    n_total = len(summary)
    log.info("Loaded %d records from summary", n_total)

    # Categorise failures
    failed_records = [r for r in summary if r.get("status") == "error"]
    n_failed = len(failed_records)
    n_success = n_total - n_failed

    log.info("Successful: %d | Failed: %d", n_success, n_failed)

    category_counts: Counter = Counter()
    category_labels: dict[str, str] = {}
    failed_by_cat: dict[str, list[dict]] = defaultdict(list)
    unclassified: list[dict] = []

    for rec in failed_records:
        error = rec.get("error", "")
        key, label = _classify_error(error)
        category_counts[key] += 1
        category_labels[key] = label
        failed_by_cat[key].append(rec)
        if key == "other":
            unclassified.append(rec)

    if unclassified:
        log.info("Unclassified errors:")
        for rec in unclassified[:10]:
            log.info("  %s: %s", rec.get("filename", "?"), rec.get("error", "?"))

    # Compute metrics
    success_times = [
        float(r.get("processing_time", 0))
        for r in summary if r.get("status") == "success"
    ]
    failure_times = [
        float(r.get("processing_time", 0))
        for r in failed_records
    ]
    avg_success_time = sum(success_times) / len(success_times) if success_times else 0.0
    avg_failure_time = sum(failure_times) / len(failure_times) if failure_times else 0.0
    total_time = sum(success_times) + sum(failure_times)

    # Build metrics CSV rows
    metrics_rows: list[dict[str, str]] = [
        {"metric": "Total images", "value": str(n_total)},
        {"metric": "Passed", "value": str(n_success)},
        {"metric": "Failed", "value": str(n_failed)},
        {"metric": "Success rate", "value": f"{n_success / n_total * 100:.2f}%"},
        {"metric": "Failure rate", "value": f"{n_failed / n_total * 100:.2f}%"},
        {"metric": "Avg processing time (success)", "value": f"{avg_success_time:.3f}s"},
        {"metric": "Avg processing time (failure)", "value": f"{avg_failure_time:.3f}s"},
        {"metric": "Total processing time", "value": f"{total_time:.3f}s"},
    ]
    for key in sorted(category_counts, key=category_counts.get, reverse=True):
        count = category_counts[key]
        label = category_labels.get(key, key)
        metrics_rows.append({"metric": f"Failure — {label}", "value": str(count)})

    recommendations = _generate_recommendations(
        category_counts, n_failed, total_time, avg_success_time, avg_failure_time,
    )

    # Copy failed images into category folders
    failures_dir.mkdir(parents=True, exist_ok=True)
    contact_sheets_dir.mkdir(parents=True, exist_ok=True)

    copied_count = 0
    for key, records_list in tqdm(failed_by_cat.items(), desc="Copying failed images"):
        cat_dir = failures_dir / key
        cat_dir.mkdir(parents=True, exist_ok=True)
        for rec in records_list:
            fn = rec.get("filename", "")
            src = img_dir / fn
            dst = cat_dir / fn
            if src.exists():
                shutil.copy2(str(src), str(dst))
                copied_count += 1

    log.info("Copied %d failed images into %d category folders", copied_count, len(failed_by_cat))

    # Generate contact sheets
    cols = args.grid_cols
    rows = args.grid_rows
    thumb = (args.thumb_size, args.thumb_size)

    contact_sheets: dict[str, str] = {}
    for key, records_list in tqdm(failed_by_cat.items(), desc="Generating contact sheets"):
        label = category_labels.get(key, key)
        safe_name = key
        img_paths = [img_dir / r.get("filename", "") for r in records_list if (img_dir / r.get("filename", "")).exists()]
        if not img_paths:
            continue
        cs_path = contact_sheets_dir / f"{safe_name}_contact.jpg"
        _make_contact_sheet(img_paths, cs_path, cols=cols, rows=rows, thumb_size=thumb)
        contact_sheets[key] = str(cs_path.relative_to(benchmark_dir))

    # Write CSV report
    csv_path = benchmark_dir / "failure_report.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["metric", "value"])  # type: ignore[arg-type]
        writer.writeheader()
        writer.writerows(metrics_rows)  # type: ignore[arg-type]
    log.info("CSV report written to %s", csv_path)

    # Write HTML report
    html = _build_html_report(
        category_counts=dict(category_counts),
        category_labels=category_labels,
        failed_by_cat=dict(failed_by_cat),
        n_total=n_total,
        n_success=n_success,
        n_failed=n_failed,
        metrics_csv_rows=metrics_rows,
        recommendations=recommendations,
        contact_sheets=contact_sheets,
    )
    html_path = benchmark_dir / "failure_report.html"
    html_path.write_text(html, encoding="utf-8")
    log.info("HTML report written to %s", html_path)

    # Print summary
    log.info("=" * 55)
    log.info("FAILURE ANALYSIS SUMMARY")
    log.info("  Total images       %d", n_total)
    log.info("  Passed             %d  (%.1f%%)", n_success, n_success / n_total * 100)
    log.info("  Failed             %d  (%.1f%%)", n_failed, n_failed / n_total * 100)
    log.info("  Categories:")
    for key in sorted(category_counts, key=category_counts.get, reverse=True):
        count = category_counts[key]
        pct = count / n_failed * 100
        log.info("    %-30s %3d  (%5.1f%%)", category_labels.get(key, key), count, pct)
    log.info("  Avg success time   %.3fs", avg_success_time)
    log.info("  Avg failure time   %.3fs", avg_failure_time)
    log.info("  Contact sheets     %s", contact_sheets_dir)
    log.info("=" * 55)


if __name__ == "__main__":
    main()
