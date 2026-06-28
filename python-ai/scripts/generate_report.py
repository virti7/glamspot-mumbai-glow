#!/usr/bin/env python3
"""Generate evaluation reports from benchmark results.

Reads all prediction JSONs and the evaluation summary CSV, computes
aggregate metrics, and produces:

- ``evaluation_report.csv``  — machine-readable metrics
- ``evaluation_report.html`` — self-contained HTML report with charts

Usage:
    python scripts/generate_report.py
    python scripts/generate_report.py --benchmark D:/Data/GlamAI-Benchmark
    python scripts/generate_report.py --output ./my-report.html
"""

import argparse
import csv
import json
import logging
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("generate_report")

BENCHMARK_DIR = Path("D:/AI-Dataset/GlamAI-Benchmark")


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def _load_results(results_dir: Path) -> list[dict]:
    """Load all prediction JSONs from the results directory."""
    results: list[dict] = []
    for p in sorted(results_dir.glob("*.json")):
        try:
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            data["_filename"] = p.stem
            results.append(data)
        except Exception as exc:
            log.warning("Cannot read %s: %s", p.name, exc)
    log.info("Loaded %d result JSONs from %s", len(results), results_dir)
    return results


def _load_summary(summary_path: Path) -> list[dict]:
    """Load the evaluation summary CSV."""
    if not summary_path.exists():
        log.warning("Summary CSV not found: %s", summary_path)
        return []
    with open(summary_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = list(reader)
    log.info("Loaded %d summary records from %s", len(records), summary_path)
    return records


# ---------------------------------------------------------------------------
# Metrics computation
# ---------------------------------------------------------------------------


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _compute_metrics(
    results: list[dict],
    summary: list[dict],
) -> dict:
    """Compute aggregate evaluation metrics.

    Returns a flat dict suitable for CSV output and as the data source
    for the HTML report.
    """
    n_total = len(summary) if summary else len(results)

    # Count statuses from summary (authoritative record)
    n_success = sum(1 for r in summary if r.get("status") == "success") if summary else n_total
    n_skipped = sum(1 for r in summary if r.get("status") == "skipped") if summary else 0
    n_errors = sum(1 for r in summary if r.get("status") == "error") if summary else 0
    n_failed = n_errors

    # Average face confidence
    confidences = [
        _safe_float(r.get("face", {}).get("confidence", 0)) for r in results
    ]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    # Face detection failures
    face_failures = [r for r in results if not r.get("face", {}).get("detected", False)]
    n_face_failures = len(face_failures)

    # Parsing failures (missing or empty parsing)
    parsing_failures = [
        r for r in results if not r.get("parsing") or not r.get("parsing", {}).get("skin", {})
    ]
    n_parsing_failures = len(parsing_failures)

    # Skin tone distribution
    skin_tones = Counter()
    for r in results:
        st = r.get("skin_tone", {})
        if st and st.get("fitzpatrick"):
            skin_tones[st["fitzpatrick"]] += 1

    # Average skin health
    health_scores = [
        _safe_float(r.get("skin_analysis", {}).get("overall_skin_health", 0))
        for r in results
        if r.get("skin_analysis", {}).get("overall_skin_health") is not None
    ]
    avg_skin_health = sum(health_scores) / len(health_scores) if health_scores else 0.0

    # Face shape distribution
    face_shapes = Counter()
    for r in results:
        s = r.get("shape", {})
        if s and s.get("type"):
            face_shapes[s["type"]] += 1

    # Processing times
    proc_times = [
        _safe_float(r.get("_processing_time", 0))
        for r in results
    ]
    if not proc_times:
        proc_times = [
            _safe_float(rec.get("processing_time", 0))
            for rec in summary
        ]
    avg_proc_time = sum(proc_times) / len(proc_times) if proc_times else 0.0
    max_proc_time = max(proc_times) if proc_times else 0.0
    min_proc_time = min(proc_times) if proc_times else 0.0

    # Success rate
    success_rate = (n_success / n_total * 100) if n_total > 0 else 0.0

    # Failed images list
    failed_images: list[dict] = []
    if summary:
        for rec in summary:
            if rec.get("status") == "error":
                failed_images.append({
                    "filename": rec.get("filename", ""),
                    "error": rec.get("error", ""),
                })
    # Also check results for face/parsing failures
    for r in face_failures:
        fn = r.get("_filename", "unknown")
        if not any(f["filename"] == fn for f in failed_images):
            failed_images.append({"filename": fn, "error": "Face detection failed"})
    for r in parsing_failures:
        fn = r.get("_filename", "unknown")
        if not any(f["filename"] == fn for f in failed_images):
            failed_images.append({"filename": fn, "error": "Parsing failed"})

    # Unique list
    seen = set()
    unique_failed: list[dict] = []
    for f in failed_images:
        if f["filename"] not in seen:
            seen.add(f["filename"])
            unique_failed.append(f)

    # Build metrics dict
    metrics: dict = {
        "report_date": datetime.now().isoformat(),
        "total_images": n_total,
        "successful": n_success,
        "skipped": n_skipped,
        "failed": n_failed,
        "success_rate": round(success_rate, 2),
        "failure_rate": round(100.0 - success_rate, 2),
        "average_face_confidence": round(avg_confidence, 4),
        "face_detection_failures": n_face_failures,
        "parsing_failures": n_parsing_failures,
        "average_skin_health": round(avg_skin_health, 2),
        "average_skin_tone": skin_tones.most_common(1)[0][0] if skin_tones else "N/A",
        "average_processing_time": round(avg_proc_time, 3),
        "max_processing_time": round(max_proc_time, 3),
        "min_processing_time": round(min_proc_time, 3),
        "total_processing_time": round(sum(proc_times), 3),
        "skin_tone_distribution": dict(skin_tones),
        "face_shape_distribution": dict(face_shapes),
        "failed_images": unique_failed,
    }
    return metrics


# ---------------------------------------------------------------------------
# CSV report
# ---------------------------------------------------------------------------


def _write_csv(metrics: dict, path: Path) -> None:
    """Write a flat CSV with one metric per row."""
    flat_rows: list[dict[str, str]] = []

    scalar_keys = [
        ("report_date", "Report date"),
        ("total_images", "Total images"),
        ("successful", "Successful"),
        ("skipped", "Skipped"),
        ("failed", "Failed"),
        ("success_rate", "Success rate (%)"),
        ("failure_rate", "Failure rate (%)"),
        ("average_face_confidence", "Average face confidence"),
        ("face_detection_failures", "Face detection failures"),
        ("parsing_failures", "Parsing failures"),
        ("average_skin_health", "Average skin health"),
        ("average_skin_tone", "Most common skin tone"),
        ("average_processing_time", "Average processing time (s)"),
        ("max_processing_time", "Max processing time (s)"),
        ("min_processing_time", "Min processing time (s)"),
        ("total_processing_time", "Total processing time (s)"),
    ]
    for key, label in scalar_keys:
        flat_rows.append({"metric": label, "value": str(metrics.get(key, ""))})

    # Skin tone distribution
    for tone, count in metrics.get("skin_tone_distribution", {}).items():
        flat_rows.append({"metric": f"Skin tone count — {tone}", "value": str(count)})

    # Face shape distribution
    for shape, count in metrics.get("face_shape_distribution", {}).items():
        flat_rows.append({"metric": f"Face shape count — {shape}", "value": str(count)})

    # Failed images
    for fi in metrics.get("failed_images", []):
        flat_rows.append({
            "metric": f"Failed image — {fi['filename']}",
            "value": fi["error"],
        })

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["metric", "value"])  # type: ignore[arg-type]
        writer.writeheader()
        writer.writerows(flat_rows)  # type: ignore[arg-type]

    log.info("CSV report written to %s", path)


# ---------------------------------------------------------------------------
# HTML report
# ---------------------------------------------------------------------------


def _build_html(metrics: dict) -> str:
    """Build a self-contained HTML report with embedded CSS and Chart.js."""

    skin_tone_labels = json.dumps(list(metrics.get("skin_tone_distribution", {}).keys()))
    skin_tone_data = json.dumps(list(metrics.get("skin_tone_distribution", {}).values()))

    shape_labels = json.dumps(list(metrics.get("face_shape_distribution", {}).keys()))
    shape_data = json.dumps(list(metrics.get("face_shape_distribution", {}).values()))

    failed_rows = ""
    for fi in metrics.get("failed_images", []):
        failed_rows += (
            f"<tr><td>{fi['filename']}</td><td>{fi['error']}</td></tr>\n"
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GlamAI — Evaluation Report</title>
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
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
  .summary-card {{
    background: #fff; border-radius: 10px; padding: 1.25rem; text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: transform 0.15s;
  }}
  .summary-card:hover {{ transform: translateY(-2px); }}
  .summary-card .value {{ font-size: 2rem; font-weight: 700; color: #16213e; }}
  .summary-card .label {{ font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }}
  .summary-card.success .value {{ color: #27ae60; }}
  .summary-card.failure .value {{ color: #e74c3c; }}
  .charts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }}
  .chart-card {{ background: #fff; border-radius: 10px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .chart-card h3 {{ margin-bottom: 0.75rem; font-size: 1rem; color: #333; }}
  .chart-card canvas {{ max-height: 280px; }}
  .section {{ margin-bottom: 2rem; }}
  .section h2 {{ font-size: 1.2rem; margin-bottom: 0.75rem; color: #16213e; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.4rem; }}
  table {{
    width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px;
    overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }}
  th, td {{ padding: 0.6rem 1rem; text-align: left; font-size: 0.9rem; }}
  th {{ background: #16213e; color: #fff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }}
  tr:nth-child(even) {{ background: #f9f9fb; }}
  .badge {{ display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }}
  .badge-ok {{ background: #d5f5e3; color: #1e8449; }}
  .badge-fail {{ background: #fadbd8; color: #922b21; }}
  .badge-skip {{ background: #fef9e7; color: #9a7d0a; }}
</style>
</head>
<body>
<div class="container">

<h1>GlamAI — Pipeline Evaluation Report</h1>
<p class="subtitle">Generated {metrics.get("report_date", "")} &middot; {metrics.get("total_images", 0)} benchmark images</p>

<div class="summary-grid">
  <div class="summary-card success">
    <div class="value">{metrics.get("success_rate", 0):.1f}%</div>
    <div class="label">Success Rate</div>
  </div>
  <div class="summary-card">
    <div class="value">{metrics.get("total_images", 0)}</div>
    <div class="label">Total Images</div>
  </div>
  <div class="summary-card failure">
    <div class="value">{metrics.get("failed", 0)}</div>
    <div class="label">Failed</div>
  </div>
  <div class="summary-card">
    <div class="value">{metrics.get("average_face_confidence", 0):.3f}</div>
    <div class="label">Avg Face Confidence</div>
  </div>
  <div class="summary-card">
    <div class="value">{metrics.get("average_skin_health", 0):.1f}</div>
    <div class="label">Avg Skin Health</div>
  </div>
  <div class="summary-card">
    <div class="value">{metrics.get("face_detection_failures", 0)}</div>
    <div class="label">Face Detection Failures</div>
  </div>
  <div class="summary-card">
    <div class="value">{metrics.get("parsing_failures", 0)}</div>
    <div class="label">Parsing Failures</div>
  </div>
  <div class="summary-card">
    <div class="value">{metrics.get("average_processing_time", 0):.2f}s</div>
    <div class="label">Avg Processing Time</div>
  </div>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>Face Shape Distribution</h3>
    <canvas id="shapeChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>Skin Tone Distribution</h3>
    <canvas id="skinToneChart"></canvas>
  </div>
</div>

<div class="section">
  <h2>Processing Time</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Average</td><td>{metrics.get("average_processing_time", 0):.3f} s</td></tr>
    <tr><td>Min</td><td>{metrics.get("min_processing_time", 0):.3f} s</td></tr>
    <tr><td>Max</td><td>{metrics.get("max_processing_time", 0):.3f} s</td></tr>
    <tr><td>Total</td><td>{metrics.get("total_processing_time", 0):.3f} s</td></tr>
  </table>
</div>

{"<div class='section'><h2>Failed Images</h2><table><tr><th>Filename</th><th>Error</th></tr>" + failed_rows + "</table></div>" if failed_rows else ""}

<div class="section">
  <h2>Detailed Metrics</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Images</td><td>{metrics.get("total_images", 0)}</td></tr>
    <tr><td>Successful</td><td>{metrics.get("successful", 0)} <span class="badge badge-ok">OK</span></td></tr>
    <tr><td>Skipped (resume)</td><td>{metrics.get("skipped", 0)} <span class="badge badge-skip">skip</span></td></tr>
    <tr><td>Failed</td><td>{metrics.get("failed", 0)} <span class="badge badge-fail">FAIL</span></td></tr>
    <tr><td>Success Rate</td><td>{metrics.get("success_rate", 0):.2f}%</td></tr>
    <tr><td>Face Detection Failures</td><td>{metrics.get("face_detection_failures", 0)}</td></tr>
    <tr><td>Parsing Failures</td><td>{metrics.get("parsing_failures", 0)}</td></tr>
    <tr><td>Average Face Confidence</td><td>{metrics.get("average_face_confidence", 0):.4f}</td></tr>
    <tr><td>Average Skin Health</td><td>{metrics.get("average_skin_health", 0):.2f}</td></tr>
    <tr><td>Most Common Skin Tone</td><td>{metrics.get("average_skin_tone", "N/A")}</td></tr>
    <tr><td>Average Processing Time</td><td>{metrics.get("average_processing_time", 0):.3f} s</td></tr>
  </table>
</div>

</div>

<script>
  const shapeCtx = document.getElementById('shapeChart').getContext('2d');
  new Chart(shapeCtx, {{
    type: 'bar',
    data: {{
      labels: {shape_labels},
      datasets: [{{
        label: 'Count',
        data: {shape_data},
        backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#34495e'],
        borderRadius: 4,
      }}]
    }},
    options: {{
      responsive: true,
      plugins: {{ legend: {{ display: false }} }},
      scales: {{ y: {{ beginAtZero: true, ticks: {{ stepSize: 1 }} }} }}
    }}
  }});

  const toneCtx = document.getElementById('skinToneChart').getContext('2d');
  new Chart(toneCtx, {{
    type: 'bar',
    data: {{
      labels: {skin_tone_labels},
      datasets: [{{
        label: 'Count',
        data: {skin_tone_data},
        backgroundColor: ['#f5cba7','#e8b88a','#d4956b','#c0764e','#a85d36','#8b4513','#6b3410','#5c2d0e'],
        borderRadius: 4,
      }}]
    }},
    options: {{
      responsive: true,
      plugins: {{ legend: {{ display: false }} }},
      scales: {{ y: {{ beginAtZero: true, ticks: {{ stepSize: 1 }} }} }}
    }}
  }});
</script>
</body>
</html>"""


def _write_html(metrics: dict, path: Path) -> None:
    """Write the self-contained HTML report."""
    html = _build_html(metrics)
    path.write_text(html, encoding="utf-8")
    log.info("HTML report written to %s", path)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate evaluation reports")
    parser.add_argument(
        "--benchmark",
        type=str,
        default=str(BENCHMARK_DIR),
        help="Benchmark dataset root directory",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory for reports (defaults to benchmark dir)",
    )
    args = parser.parse_args()

    benchmark_dir = Path(args.benchmark)
    if not benchmark_dir.is_dir():
        log.error("Benchmark directory not found: %s", benchmark_dir)
        sys.exit(1)

    out_dir = Path(args.output) if args.output else benchmark_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    results_dir = benchmark_dir / "results"
    summary_path = benchmark_dir / "evaluation_summary.csv"

    results = _load_results(results_dir) if results_dir.is_dir() else []
    summary = _load_summary(summary_path)

    if not results and not summary:
        log.error("No results found in %s. Run evaluate_dataset.py first.", benchmark_dir)
        sys.exit(1)

    # Compute metrics
    log.info("Computing aggregate metrics from %d result(s) ...", len(results) or len(summary))
    metrics = _compute_metrics(results, summary)

    # Write reports
    _write_csv(metrics, out_dir / "evaluation_report.csv")
    _write_html(metrics, out_dir / "evaluation_report.html")

    log.info("Reports generated successfully in %s", out_dir)


if __name__ == "__main__":
    main()
