#!/usr/bin/env python3
"""Smoke test: verify a single benchmark image passes through the pipeline.

Usage:
    cd python-ai
    python scripts/smoke_test.py
    python scripts/smoke_test.py --image D:/AI-Dataset/GlamAI-Benchmark/images/0.jpg
"""

import argparse
import json
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.services.pipeline_service import PipelineService


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test the GlamAI pipeline")
    parser.add_argument(
        "--image",
        type=str,
        default="D:/AI-Dataset/GlamAI-Benchmark/images/0.jpg",
        help="Path to a benchmark image",
    )
    args = parser.parse_args()

    img_path = Path(args.image)
    if not img_path.exists():
        print(f"Image not found: {img_path}")
        print("Run benchmark_generator.py first or specify a different image.")
        sys.exit(1)

    print(f"Loading pipeline (models load on first use)...")
    pipe = PipelineService()

    print(f"Processing {img_path} ...")
    result = pipe.analyze_from_file(str(img_path))

    status = result.get("status", "unknown")
    face = result.get("face", {})
    shape = result.get("shape", {})
    skin = result.get("skin_analysis", {})
    skin_tone = result.get("skin_tone", {})

    print(f"  Status:           {status}")
    print(f"  Face detected:    {face.get('detected', False)}")
    print(f"  Face confidence:  {face.get('confidence', 0):.3f}")
    print(f"  Face shape:       {shape.get('type', 'N/A')}")
    print(f"  Skin health:      {skin.get('overall_skin_health', 'N/A')}")
    print(f"  Skin tone:        {skin_tone.get('fitzpatrick', 'N/A')}")
    print()

    if status == "success":
        print("PASS: Pipeline completed successfully.")
    else:
        print(f"FAIL: Pipeline returned status '{status}'.")
        sys.exit(1)


if __name__ == "__main__":
    main()
