"""Parsing evaluation metrics for face-segmentation comparison.

Provides pixel-level classification metrics: per-class IoU, Dice,
precision, recall, F1, pixel accuracy, mean IoU, and confusion
matrix computation.
"""

from __future__ import annotations

import numpy as np

# ---------------------------------------------------------------------------
# Confusion matrix
# ---------------------------------------------------------------------------


def confusion_matrix(
    pred: np.ndarray,
    target: np.ndarray,
    num_classes: int = 19,
) -> np.ndarray:
    """Compute the multi-class confusion matrix.

    Args:
        pred: Predicted class-index map (H, W).
        target: Ground-truth class-index map (H, W).
        num_classes: Number of classes (0 … num_classes-1).

    Returns:
        ``(num_classes, num_classes)`` matrix where ``C[i, j]`` is
        the number of pixels with true label ``i`` predicted as ``j``.
    """
    pred = pred.ravel()
    target = target.ravel()
    mask = (target >= 0) & (target < num_classes) & (pred >= 0) & (pred < num_classes)
    return np.bincount(
        num_classes * target[mask].astype(np.int32) + pred[mask].astype(np.int32),
        minlength=num_classes * num_classes,
    ).reshape(num_classes, num_classes)


# ---------------------------------------------------------------------------
# Per-class metrics
# ---------------------------------------------------------------------------


def metrics_from_confusion(
    cm: np.ndarray,
) -> dict[str, np.ndarray]:
    """Derive per-class metrics from the confusion matrix.

    Returns dict with arrays of shape ``(num_classes,)``:

    - ``iou``: Intersection over Union (Jaccard index).
    - ``dice``: Dice / F1 coefficient.
    - ``precision``: True positives / (true positives + false positives).
    - ``recall``: True positives / (true positives + false negatives).
    - ``f1``: Harmonic mean of precision and recall.
    - ``support``: Number of ground-truth pixels per class.
    """
    tp = np.diag(cm).astype(np.float64)
    fp = cm.sum(axis=0) - tp
    fn = cm.sum(axis=1) - tp
    support = cm.sum(axis=1).astype(np.int64)

    iou = tp / (tp + fp + fn + 1e-12)
    dice = 2.0 * tp / (2.0 * tp + fp + fn + 1e-12)
    precision = tp / (tp + fp + 1e-12)
    recall = tp / (tp + fn + 1e-12)
    f1 = 2.0 * precision * recall / (precision + recall + 1e-12)

    return {
        "iou": iou,
        "dice": dice,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "support": support,
    }


def pixel_accuracy(cm: np.ndarray) -> float:
    """Overall pixel accuracy: diagonal / total."""
    return float(np.diag(cm).sum() / (cm.sum() + 1e-12))


def mean_iou(cm: np.ndarray) -> float:
    """Mean IoU across all classes."""
    metrics = metrics_from_confusion(cm)
    return float(metrics["iou"].mean())


def frequency_weighted_iou(cm: np.ndarray) -> float:
    """Frequency-weighted IoU (FW-IoU)."""
    metrics = metrics_from_confusion(cm)
    total = cm.sum()
    weights = metrics["support"].astype(np.float64) / (total + 1e-12)
    return float((metrics["iou"] * weights).sum())


# ---------------------------------------------------------------------------
# Batch helpers
# ---------------------------------------------------------------------------


def compute_metrics(
    pred: np.ndarray,
    target: np.ndarray,
    num_classes: int = 19,
) -> dict:
    """One-shot metric computation from a single prediction–target pair.

    Args:
        pred: Predicted class-index map (H, W).
        target: Ground-truth class-index map (H, W).
        num_classes: Number of classes.

    Returns:
        dict with keys ``cm``, ``per_class``, ``pixel_acc``,
        ``mean_iou``, ``fw_iou``.
    """
    cm = confusion_matrix(pred, target, num_classes)
    per_class = metrics_from_confusion(cm)
    return {
        "cm": cm,
        "per_class": per_class,
        "pixel_acc": pixel_accuracy(cm),
        "mean_iou": mean_iou(cm),
        "fw_iou": frequency_weighted_iou(cm),
    }


def aggregate_metrics(results: list[dict]) -> dict:
    """Aggregate per-image confusion matrices into global metrics.

    Args:
        results: list of dicts, each containing at least ``"cm"``.

    Returns:
        Aggregated dict with per-class metrics, pixel_acc, mIoU.
    """
    if not results:
        return {}
    summed_cm = sum(r["cm"] for r in results).astype(np.int64)
    per_class = metrics_from_confusion(summed_cm)
    return {
        "cm": summed_cm,
        "per_class": per_class,
        "pixel_acc": pixel_accuracy(summed_cm),
        "mean_iou": mean_iou(summed_cm),
        "fw_iou": frequency_weighted_iou(summed_cm),
        "num_images": len(results),
    }
