import os
import sys
import urllib.request

MODEL_URL = (
    "https://github.com/yakhyo/face-parsing/releases/download/weights/resnet18.onnx"
)
TARGET_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        os.pardir,
        "app",
        "assets",
        "models",
        "face_parsing.onnx",
    )
)

# Expected minimum size for a valid resnet18.onnx: ~43-45 MB
_MIN_EXPECTED_BYTES = 40 * 1024 * 1024


def download_model():
    if os.path.exists(TARGET_PATH):
        size_mb = os.path.getsize(TARGET_PATH) / (1024 * 1024)
        if size_mb * 1024 * 1024 >= _MIN_EXPECTED_BYTES:
            print(f"[SKIP] Model already exists at: {TARGET_PATH} ({size_mb:.1f} MB)")
            return
        print(
            f"[WARN] Existing model is too small ({size_mb:.1f} MB). Re-downloading."
        )
        os.remove(TARGET_PATH)

    os.makedirs(os.path.dirname(TARGET_PATH), exist_ok=True)

    print(f"[INFO] Downloading {MODEL_URL}")
    print(f"[INFO] Saving to: {TARGET_PATH}")

    def report(block_count, block_size, total_size):
        downloaded = block_count * block_size / (1024 * 1024)
        total_mb = total_size / (1024 * 1024)
        if total_size > 0:
            percent = min(100, block_count * block_size * 100 / total_size)
            print(f"\r  {downloaded:.1f} / {total_mb:.1f} MB ({percent:.0f}%)", end="")

    try:
        urllib.request.urlretrieve(MODEL_URL, TARGET_PATH, reporthook=report)
    except Exception as exc:
        if os.path.exists(TARGET_PATH):
            os.remove(TARGET_PATH)
        print(f"\n[ERROR] Download failed: {exc}")
        sys.exit(1)

    print()

    final_mb = os.path.getsize(TARGET_PATH) / (1024 * 1024)

    if os.path.getsize(TARGET_PATH) < _MIN_EXPECTED_BYTES:
        os.remove(TARGET_PATH)
        print(
            f"[ERROR] Downloaded file is too small ({final_mb:.1f} MB). "
            f"Expected >= {_MIN_EXPECTED_BYTES / (1024 * 1024):.0f} MB."
        )
        sys.exit(1)

    print(f"[DONE] Downloaded {final_mb:.1f} MB to {TARGET_PATH}")


if __name__ == "__main__":
    download_model()
