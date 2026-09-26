"""
Evaluation metrics for NER-SHIELD.

Provides F1, IoU (Jaccard), precision, recall, and AUC calculations
for classification and segmentation tasks.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from src.utils.logger import get_logger

logger = get_logger(__name__)


class MetricsCalculator:
    """Accumulates predictions and computes evaluation metrics.

    Supports both classification (label-level) and segmentation
    (pixel-level) metrics.

    Args:
        num_classes: Number of classes.
        class_names: Ordered list of human-readable class names.
        task: ``"classification"`` or ``"segmentation"``.
    """

    def __init__(
        self,
        num_classes: int,
        class_names: Optional[List[str]] = None,
        task: str = "classification",
    ) -> None:
        self.num_classes = num_classes
        self.class_names = class_names or [f"class_{i}" for i in range(num_classes)]
        self.task = task
        self.reset()

    def reset(self) -> None:
        """Clear accumulated predictions."""
        self.all_preds: List[np.ndarray] = []
        self.all_targets: List[np.ndarray] = []
        self.all_probs: List[np.ndarray] = []

    def update(
        self,
        preds: np.ndarray,
        targets: np.ndarray,
        probs: Optional[np.ndarray] = None,
    ) -> None:
        """Add a batch of predictions.

        Args:
            preds: Predicted class indices (flat array).
            targets: Ground-truth class indices (flat array).
            probs: Optional probability matrix ``(N, C)`` for AUC.
        """
        self.all_preds.append(preds.flatten())
        self.all_targets.append(targets.flatten())
        if probs is not None:
            self.all_probs.append(probs.reshape(-1, self.num_classes))

    def _gather(self) -> Tuple[np.ndarray, np.ndarray]:
        preds = np.concatenate(self.all_preds)
        targets = np.concatenate(self.all_targets)
        return preds, targets

    # -----------------------------------------------------------------
    # Classification metrics
    # -----------------------------------------------------------------

    def compute_accuracy(self) -> float:
        """Overall accuracy."""
        preds, targets = self._gather()
        return float(accuracy_score(targets, preds))

    def compute_f1(self, average: str = "weighted") -> float:
        """F1 score.

        Args:
            average: Averaging method — ``"weighted"``, ``"macro"``,
                ``"micro"``, or ``None`` for per-class.

        Returns:
            Scalar F1 value.
        """
        preds, targets = self._gather()
        return float(
            f1_score(targets, preds, average=average, zero_division=0)
        )

    def compute_precision(self, average: str = "weighted") -> float:
        """Precision score."""
        preds, targets = self._gather()
        return float(
            precision_score(targets, preds, average=average, zero_division=0)
        )

    def compute_recall(self, average: str = "weighted") -> float:
        """Recall score."""
        preds, targets = self._gather()
        return float(
            recall_score(targets, preds, average=average, zero_division=0)
        )

    def compute_auc(self, average: str = "weighted") -> float:
        """ROC-AUC (requires stored probability predictions).

        Args:
            average: Averaging method for multi-class AUC.

        Returns:
            Scalar AUC value, or 0.0 if probabilities are not available.
        """
        if not self.all_probs:
            logger.warning("No probability predictions stored; AUC = 0.0")
            return 0.0
        _, targets = self._gather()
        probs = np.concatenate(self.all_probs)

        try:
            return float(
                roc_auc_score(
                    targets,
                    probs,
                    multi_class="ovr",
                    average=average,
                )
            )
        except ValueError as e:
            logger.warning("AUC computation failed: %s", e)
            return 0.0

    def compute_confusion_matrix(self) -> np.ndarray:
        """Compute the confusion matrix."""
        preds, targets = self._gather()
        return confusion_matrix(
            targets, preds, labels=list(range(self.num_classes))
        )

    def compute_classification_report(self) -> str:
        """Full ``sklearn`` classification report as a string."""
        preds, targets = self._gather()
        return classification_report(
            targets,
            preds,
            target_names=self.class_names,
            zero_division=0,
        )

    # -----------------------------------------------------------------
    # Segmentation metrics
    # -----------------------------------------------------------------

    def compute_iou(self, per_class: bool = False) -> float | Dict[str, float]:
        """Intersection over Union (Jaccard index).

        Args:
            per_class: If *True*, return a dict of per-class IoU values.

        Returns:
            Mean IoU (excluding background) or per-class dict.
        """
        preds, targets = self._gather()
        ious: Dict[str, float] = {}

        for cls_idx in range(self.num_classes):
            pred_mask = preds == cls_idx
            target_mask = targets == cls_idx
            intersection = np.logical_and(pred_mask, target_mask).sum()
            union = np.logical_or(pred_mask, target_mask).sum()
            iou = float(intersection / union) if union > 0 else 0.0
            ious[self.class_names[cls_idx]] = iou

        if per_class:
            return ious

        # Mean IoU, excluding background (class 0)
        non_bg = [v for k, v in ious.items() if k != "background"]
        return float(np.mean(non_bg)) if non_bg else 0.0

    def compute_dice(self, per_class: bool = False) -> float | Dict[str, float]:
        """Dice coefficient (F1 at the pixel level).

        Args:
            per_class: If *True*, return per-class Dice values.

        Returns:
            Mean Dice or per-class dict.
        """
        preds, targets = self._gather()
        dices: Dict[str, float] = {}

        for cls_idx in range(self.num_classes):
            pred_mask = preds == cls_idx
            target_mask = targets == cls_idx
            intersection = np.logical_and(pred_mask, target_mask).sum()
            total = pred_mask.sum() + target_mask.sum()
            dice = float(2 * intersection / total) if total > 0 else 0.0
            dices[self.class_names[cls_idx]] = dice

        if per_class:
            return dices

        non_bg = [v for k, v in dices.items() if k != "background"]
        return float(np.mean(non_bg)) if non_bg else 0.0

    # -----------------------------------------------------------------
    # Unified summary
    # -----------------------------------------------------------------

    def compute_all(self) -> Dict[str, float]:
        """Compute and return all relevant metrics as a flat dictionary.

        Returns:
            Dictionary of metric names to values.
        """
        metrics: Dict[str, float] = {}

        if self.task == "classification":
            metrics["accuracy"] = self.compute_accuracy()
            metrics["f1_weighted"] = self.compute_f1("weighted")
            metrics["f1_macro"] = self.compute_f1("macro")
            metrics["precision_weighted"] = self.compute_precision("weighted")
            metrics["recall_weighted"] = self.compute_recall("weighted")
            metrics["auc_weighted"] = self.compute_auc("weighted")
        elif self.task == "segmentation":
            metrics["mean_iou"] = self.compute_iou(per_class=False)
            metrics["mean_dice"] = self.compute_dice(per_class=False)
            metrics["pixel_accuracy"] = self.compute_accuracy()
            per_class_iou = self.compute_iou(per_class=True)
            assert isinstance(per_class_iou, dict)
            for name, val in per_class_iou.items():
                metrics[f"iou_{name}"] = val

        return metrics

    def log_summary(self) -> Dict[str, float]:
        """Compute all metrics and log them.

        Returns:
            The computed metrics dictionary.
        """
        metrics = self.compute_all()
        logger.info("--- %s Metrics ---", self.task.capitalize())
        for k, v in metrics.items():
            logger.info("  %-30s: %.4f", k, v)
        if self.task == "classification":
            logger.info("\n%s", self.compute_classification_report())
        return metrics
