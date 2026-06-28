#!/usr/bin/env python3
"""Compare direct ONNX inference vs pipeline output for face parsing.

Generates:
  01_comparison_overlay.png   – side-by-side: pipeline | direct | diff (red)
  02_diff_only.png            – grayscale image with only differing pixels
  03_boundary_analysis.png    – shows whether differences lie on class boundaries
  04_semantic_diff.png        – per-class diff locations color-coded by class
  report.txt                  – structured analysis of all differences
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.providers.faceparsing_provider import FaceParsingProvider
from app.services.pipeline_service import PipelineService, decode_mask_compact
from app.config.face_detection import FaceDetectionConfig
from app.services.parsing_service import _CLASS_MAP

OUTPUT_DIR = Path("compare_inference")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

_REVERSE_CLASS = {name: idx for idx, name in _CLASS_MAP.items()}

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

_CLASS_NAMES: list[str] = [
    "background", "skin", "l_brow", "r_brow", "l_eye",
    "r_eye", "eye_g", "l_ear", "r_ear", "ear_r",
    "nose", "mouth", "u_lip", "l_lip", "neck",
    "neck_l", "cloth", "hair", "hat",
]


def _class_name(c: int) -> str:
    return _CLASS_NAMES[c] if c < len(_CLASS_NAMES) else f"class_{c}"


def _colorize(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for cls_idx, bgr in enumerate(_CLASS_COLORS):
        color[mask == cls_idx] = bgr
    return color


def _compute_class_boundary_mask(mask: np.ndarray, radius: int = 3) -> np.ndarray:
    """Return binary mask of pixels within `radius` of any class boundary.

    Uses morphological gradient: dilate - erode on each class, then OR them.
    """
    boundary = np.zeros_like(mask, dtype=bool)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1,) * 2)
    for cls_idx in range(19):
        binary = (mask == cls_idx).astype(np.uint8)
        dilated = cv2.dilate(binary, kernel)
        eroded = cv2.erode(binary, kernel)
        boundary |= (dilated - eroded).astype(bool)
    return boundary


def main() -> None:
    print("=" * 70)
    print("  DIRECT INFERENCE vs PIPELINE OUTPUT COMPARISON")
    print("=" * 70)

    # ── Pick a test image ──
    test_candidates = [
        Path("D:/AI-Dataset/GlamAI-Benchmark/images/18.jpg"),
        Path("D:/AI-Dataset/GlamAI-Benchmark/images/106.jpg"),
        Path("D:/AI-Dataset/GlamAI-Benchmark/images/29967.jpg"),
        Path("D:/AI-Dataset/CelebAMask-HQ/CelebAMask-HQ/CelebA-HQ-img/18.jpg"),
    ]

    img_path = None
    for p in test_candidates:
        if p.is_file():
            img_path = p
            break

    if img_path is None:
        print("ERROR: No test image found.")
        sys.exit(1)

    print(f"\nTest image: {img_path}")
    original = cv2.imread(str(img_path))
    if original is None:
        print(f"ERROR: Failed to read {img_path}")
        sys.exit(1)
    print(f"  Original shape: {original.shape}")

    # ── 1. Direct inference via FaceParsingProvider ──
    print("\n── Step 1: Direct inference (FaceParsingProvider.predict) ──")

    # Get aligned face crop
    from app.providers.insightface_provider import InsightFaceProvider
    if_provider = InsightFaceProvider()
    if_provider.configure(det_size=(640, 640), det_thresh=0.5)
    faces = if_provider.detect(original)
    if not faces:
        print("ERROR: No faces detected.")
        sys.exit(1)
    largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    aligned = if_provider.get_aligned_face(original, largest)
    print(f"  Aligned face shape: {aligned.shape}")

    provider = FaceParsingProvider()
    mask_direct = provider.predict(aligned)
    print(f"  Direct mask shape: {mask_direct.shape}")
    print(f"  Unique classes: {sorted(np.unique(mask_direct).tolist())}")

    # ── 2. Pipeline output ──
    print("\n── Step 2: Pipeline output (PipelineService.analyze_from_file) ──")
    pipe = PipelineService(face_config=FaceDetectionConfig.PRESET_AGGRESSIVE)
    result = pipe.analyze_from_file(str(img_path))

    if result.get("status") != "success":
        print(f"Pipeline failed: {result.get('error')}")
        sys.exit(1)

    face_meta = result["face"]
    if not face_meta.get("detected"):
        print("No face detected!")
        sys.exit(1)

    pipeline_mask_encoded = result.get("parsing_mask_encoded")
    if pipeline_mask_encoded is None:
        print("ERROR: No parsing_mask_encoded in pipeline result")
        sys.exit(1)

    mask_pipeline = decode_mask_compact(pipeline_mask_encoded)
    print(f"  Pipeline mask shape: {mask_pipeline.shape}")
    print(f"  Unique classes: {sorted(np.unique(mask_pipeline).tolist())}")

    # ── Resize to unified resolution ──
    print("\n── Step 3: Align resolutions ──")
    h_aligned, w_aligned = aligned.shape[:2]

    if mask_direct.shape != (h_aligned, w_aligned):
        print(f"  Direct mask {mask_direct.shape} -> {h_aligned}x{w_aligned}")
        mask_direct = cv2.resize(
            mask_direct, (w_aligned, h_aligned),
            interpolation=cv2.INTER_NEAREST,
        )

    if mask_pipeline.shape != (h_aligned, w_aligned):
        print(f"  Pipeline mask {mask_pipeline.shape} -> {h_aligned}x{w_aligned}")
        mask_pipeline = cv2.resize(
            mask_pipeline, (w_aligned, h_aligned),
            interpolation=cv2.INTER_NEAREST,
        )

    print(f"  Both masks now: {mask_pipeline.shape}")

    # ── 4. Pixel-wise comparison ──
    print("\n── Step 4: Pixel-wise comparison ──")

    matches = (mask_pipeline == mask_direct).sum()
    total = mask_pipeline.size
    diff_mask = (mask_pipeline != mask_direct)
    diff_count = int(diff_mask.sum())
    match_pct = 100.0 * matches / total
    diff_pct = 100.0 * diff_count / total

    print(f"  Total pixels:      {total}")
    print(f"  Matching pixels:   {matches} ({match_pct:.2f}%)")
    print(f"  Differing pixels:  {diff_count} ({diff_pct:.2f}%)")

    # ── 5. Per-class breakdown of differences ──
    print("\n── Step 5: Per-class difference analysis ──")

    lines = []
    lines.append(f"{'Class':>5} {'Name':<20} {'Direct px':>10} {'Pipe px':>10} {'Diff px':>10} {'Boundary':>10}")
    lines.append("-" * 70)

    boundary_mask = _compute_class_boundary_mask(mask_direct, radius=3)
    total_boundary_px = int(boundary_mask.sum())

    per_class_diff: dict[str, dict] = {}
    for cls_idx in range(19):
        name = _class_name(cls_idx)
        direct_px = int((mask_direct == cls_idx).sum())
        pipe_px = int((mask_pipeline == cls_idx).sum())

        # Pixels where diff occurs AND the direct mask has this class
        this_diff = diff_mask & (mask_direct == cls_idx)
        diff_px = int(this_diff.sum())

        # Of those, how many are on/near boundaries in the direct mask?
        on_boundary = int((this_diff & boundary_mask).sum())
        boundary_str = f"{on_boundary}/{diff_px}" if diff_px else "  —  "

        per_class_diff[name] = {
            "direct_px": direct_px,
            "pipe_px": pipe_px,
            "diff_px": diff_px,
            "on_boundary": on_boundary,
        }

        if diff_px > 0:
            print(f"    {cls_idx:3d}  {name:<20s} {direct_px:>8d}  {pipe_px:>8d}  {diff_px:>8d}  {on_boundary:>8d}")
            lines.append(
                f"{cls_idx:5d} {name:<20s} {direct_px:>10d} {pipe_px:>10d} {diff_px:>10d} "
                f"{on_boundary:>5d}/{diff_px:<5d}"
            )
        else:
            lines.append(
                f"{cls_idx:5d} {name:<20s} {direct_px:>10d} {pipe_px:>10d} {diff_px:>10d} {'  —  ':>10}"
            )

    # ── 6. Boundary analysis ──
    print("\n── Step 6: Boundary proximity analysis ──")

    boundary_diff = diff_mask & boundary_mask
    interior_diff = diff_mask & ~boundary_mask
    bd_px = int(boundary_diff.sum())
    id_px = int(interior_diff.sum())
    bd_pct = 100.0 * bd_px / diff_count if diff_count > 0 else 0

    print(f"  Total boundary pixels (radius=3):  {total_boundary_px}")
    print(f"  Differing pixels ON boundary:      {bd_px} ({bd_pct:.1f}% of diffs)")
    print(f"  Differing pixels IN interior:      {id_px} ({100-bd_pct:.1f}% of diffs)")

    # ── 7. Report ──
    report_title = "DIFFERENCE REPORT: Direct Inference vs Pipeline Output"
    separator = "=" * 70

    report = [
        report_title,
        separator,
        f"Image: {img_path.name}",
        f"Aligned face size: {h_aligned}x{w_aligned}",
        "",
        f"OVERALL MATCH: {matches}/{total} ({match_pct:.2f}%)",
        f"DIFFERENCES:   {diff_count}/{total} ({diff_pct:.2f}%)",
        "",
        f"Boundary radius: 3 px",
        f"Total boundary pixels in direct mask: {total_boundary_px} ({100*total_boundary_px/total:.1f}% of image)",
        f"Differences on class boundaries:      {bd_px}/{diff_count} ({bd_pct:.1f}% of diffs)",
        f"Differences in interior regions:      {id_px}/{diff_count} ({100-bd_pct:.1f}% of diffs)",
        "",
    ]

    if diff_count == 0:
        report.append("PERFECT MATCH: No differences between direct inference and pipeline output.")
        report.append("")
    elif id_px == 0:
        report.append("All differences lie on or within 3px of class boundaries.")
        report.append("These are expected boundary artifacts from interpolation/warping.")
        report.append("")
    else:
        report.append(
            f"WARNING: {id_px} differing pixels are in interior regions "
            f"(not near any class boundary)."
        )

    report.append("Per-class difference breakdown:")
    report.append("")
    report.append(f"{'Class':>5} {'Name':<20} {'Direct px':>10} {'Pipe px':>10} {'Diff px':>10}  {'On boundary':>12}")
    report.append("-" * 70)
    for cls_idx in range(19):
        name = _class_name(cls_idx)
        info = per_class_diff[name]
        if info["diff_px"] > 0:
            report.append(
                f"{cls_idx:5d} {name:<20s} {info['direct_px']:>10d} {info['pipe_px']:>10d} "
                f"{info['diff_px']:>10d}  {info['on_boundary']:>5d}/{info['diff_px']:<5d}"
            )
        else:
            report.append(
                f"{cls_idx:5d} {name:<20s} {info['direct_px']:>10d} {info['pipe_px']:>10d} "
                f"{info['diff_px']:>10d}  {'  —  ':>12}"
            )

    if id_px == 0 and diff_count > 0:
        report.append("")
        report.append("=" * 70)
        report.append("Pipeline verified. Remaining differences are expected and acceptable.")
        report.append("=" * 70)

    with open(OUTPUT_DIR / "report.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(report) + "\n")

    print()
    for line in report:
        print(f"  {line}" if not line.startswith("=") else line)

    # ── 8. Visualizations ──
    print("\n── Step 8: Generating visualizations ──")

    # 8a. Comparison overlay: pipeline | direct | diff (red)
    aligned_rgb = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)
    color_pipeline = _colorize(mask_pipeline)
    color_direct = _colorize(mask_direct)

    overlay_pipe = cv2.addWeighted(aligned_rgb, 0.6, color_pipeline, 0.4, 0)
    overlay_direct = cv2.addWeighted(aligned_rgb, 0.6, color_direct, 0.4, 0)

    # Diff overlay: red where different
    diff_overlay = aligned_rgb.copy()
    diff_overlay[diff_mask] = (255, 0, 0)  # Red in RGB

    comparison = np.hstack([overlay_pipe, overlay_direct, diff_overlay])
    comparison_bgr = cv2.cvtColor(comparison, cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(OUTPUT_DIR / "01_comparison_overlay.png"), comparison_bgr)
    print("  Saved: 01_comparison_overlay.png  (pipeline | direct | diff)")

    # 8b. Diff-only grayscale
    diff_only = np.zeros((h_aligned, w_aligned, 3), dtype=np.uint8)
    diff_only[diff_mask] = (255, 255, 255)
    cv2.imwrite(str(OUTPUT_DIR / "02_diff_only.png"), diff_only)
    print("  Saved: 02_diff_only.png  (white = differing pixels)")

    # 8c. Boundary analysis overlay
    boundary_vis = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB).copy()
    boundary_vis[boundary_mask] = (0, 255, 255)  # Yellow = boundary zone
    boundary_vis[diff_mask & ~boundary_mask] = (255, 0, 0)  # Red = interior diff
    boundary_vis[diff_mask & boundary_mask] = (255, 128, 0)  # Orange = boundary diff
    cv2.imwrite(
        str(OUTPUT_DIR / "03_boundary_analysis.png"),
        cv2.cvtColor(boundary_vis, cv2.COLOR_RGB2BGR),
    )
    print("  Saved: 03_boundary_analysis.png  (yellow=boundary, red=interior diff, orange=boundary diff)")

    # 8d. Semantic diff: class color-coded where diff occurs
    semantic_diff = np.zeros((h_aligned, w_aligned, 3), dtype=np.uint8)
    for cls_idx in range(19):
        cls_diff = diff_mask & (mask_direct == cls_idx)
        if cls_diff.any():
            semantic_diff[cls_diff] = _CLASS_COLORS[cls_idx]
    cv2.imwrite(str(OUTPUT_DIR / "04_semantic_diff.png"), semantic_diff)
    print("  Saved: 04_semantic_diff.png  (diff pixel color = class in direct inference)")

    print(f"\nAll outputs saved to: {OUTPUT_DIR.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()
