"""
Loss functions for NER-SHIELD.

Includes Focal Loss for classification, Dice Loss for segmentation,
and combined / task-specific loss wrappers.
"""

from __future__ import annotations

from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from src.utils.logger import get_logger

logger = get_logger(__name__)


class FocalLoss(nn.Module):
    """Focal Loss for imbalanced classification.

    Reduces the loss contribution of easy examples so that the model
    focuses on hard, misclassified samples.

    ``FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)``

    Args:
        gamma: Focusing parameter.  Higher values down-weight easy
            examples more aggressively.
        alpha: Per-class weight tensor of shape ``(C,)``.
            If *None*, all classes are weighted equally.
        reduction: ``"mean"`` | ``"sum"`` | ``"none"``.
        label_smoothing: Optional label smoothing factor in ``[0, 1)``.
    """

    def __init__(
        self,
        gamma: float = 2.0,
        alpha: Optional[torch.Tensor] = None,
        reduction: str = "mean",
        label_smoothing: float = 0.0,
    ) -> None:
        super().__init__()
        self.gamma = gamma
        self.reduction = reduction
        self.label_smoothing = label_smoothing

        if alpha is not None:
            self.register_buffer("alpha", alpha.float())
        else:
            self.alpha: Optional[torch.Tensor] = None

    def forward(
        self, inputs: torch.Tensor, targets: torch.Tensor
    ) -> torch.Tensor:
        """Compute focal loss.

        Args:
            inputs: Logits ``(B, C)`` or ``(B, C, H, W)`` for segmentation.
            targets: Class indices ``(B,)`` or ``(B, H, W)``.

        Returns:
            Scalar loss (or per-sample if ``reduction="none"``).
        """
        num_classes = inputs.shape[1]

        if inputs.dim() == 4:
            # Segmentation: (B, C, H, W) -> (B*H*W, C)
            b, c, h, w = inputs.shape
            inputs = inputs.permute(0, 2, 3, 1).contiguous().view(-1, c)
            targets = targets.view(-1)

        # Label smoothing
        if self.label_smoothing > 0:
            with torch.no_grad():
                smooth_targets = torch.full_like(
                    inputs, self.label_smoothing / (num_classes - 1)
                )
                smooth_targets.scatter_(1, targets.unsqueeze(1), 1.0 - self.label_smoothing)

        log_probs = F.log_softmax(inputs, dim=1)
        probs = torch.exp(log_probs)

        # Gather the probability assigned to the true class
        targets_one_hot = F.one_hot(targets, num_classes).float()
        pt = (probs * targets_one_hot).sum(dim=1)
        log_pt = (log_probs * targets_one_hot).sum(dim=1)

        focal_weight = (1.0 - pt) ** self.gamma
        loss = -focal_weight * log_pt

        if self.alpha is not None:
            alpha_t = self.alpha.gather(0, targets)
            loss = alpha_t * loss

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


class DiceLoss(nn.Module):
    """Soft Dice Loss for segmentation.

    Works for both binary and multi-class settings.  For multi-class,
    the loss is averaged across non-background classes.

    Args:
        smooth: Smoothing constant to avoid division by zero.
        ignore_index: Class index to ignore.
        reduction: ``"mean"`` | ``"sum"`` | ``"none"``.
    """

    def __init__(
        self,
        smooth: float = 1.0,
        ignore_index: int = -1,
        reduction: str = "mean",
    ) -> None:
        super().__init__()
        self.smooth = smooth
        self.ignore_index = ignore_index
        self.reduction = reduction

    def forward(
        self, inputs: torch.Tensor, targets: torch.Tensor
    ) -> torch.Tensor:
        """Compute Dice loss.

        Args:
            inputs: Logits ``(B, C, H, W)``.
            targets: Class indices ``(B, H, W)``.

        Returns:
            Scalar Dice loss.
        """
        num_classes = inputs.shape[1]
        probs = F.softmax(inputs, dim=1)

        # One-hot encode targets
        targets_one_hot = F.one_hot(
            targets.clamp(0, num_classes - 1), num_classes
        ).permute(0, 3, 1, 2).float()

        # Mask ignored pixels
        if self.ignore_index >= 0:
            valid = (targets != self.ignore_index).unsqueeze(1).float()
            probs = probs * valid
            targets_one_hot = targets_one_hot * valid

        dims = (0, 2, 3)  # batch + spatial
        intersection = (probs * targets_one_hot).sum(dim=dims)
        cardinality = probs.sum(dim=dims) + targets_one_hot.sum(dim=dims)
        dice = (2.0 * intersection + self.smooth) / (cardinality + self.smooth)

        # Skip background class (index 0) in the average
        if num_classes > 1:
            dice_loss = 1.0 - dice[1:].mean()
        else:
            dice_loss = 1.0 - dice.mean()

        return dice_loss


class CombinedSegmentationLoss(nn.Module):
    """Combined Dice + Focal loss for segmentation.

    ``L = dice_weight * DiceLoss + focal_weight * FocalLoss``

    Args:
        dice_weight: Weight for the Dice term.
        focal_weight: Weight for the Focal term.
        focal_gamma: Gamma parameter for focal loss.
        class_weights: Optional per-class weight tensor for the focal term.
        ignore_index: Class index to ignore.
    """

    def __init__(
        self,
        dice_weight: float = 0.5,
        focal_weight: float = 0.5,
        focal_gamma: float = 2.0,
        class_weights: Optional[torch.Tensor] = None,
        ignore_index: int = -1,
    ) -> None:
        super().__init__()
        self.dice_weight = dice_weight
        self.focal_weight = focal_weight
        self.dice_loss = DiceLoss(ignore_index=ignore_index)
        self.focal_loss = FocalLoss(gamma=focal_gamma, alpha=class_weights)

    def forward(
        self, inputs: torch.Tensor, targets: torch.Tensor
    ) -> dict[str, torch.Tensor]:
        """Compute the combined loss.

        Args:
            inputs: Logits ``(B, C, H, W)``.
            targets: Class indices ``(B, H, W)``.

        Returns:
            Dictionary with ``total``, ``dice``, ``focal`` loss values.
        """
        dice = self.dice_loss(inputs, targets)
        focal = self.focal_loss(inputs, targets)
        total = self.dice_weight * dice + self.focal_weight * focal
        return {"total": total, "dice": dice, "focal": focal}


class ChangeDetectionLoss(nn.Module):
    """Multi-task loss for the change-detection network.

    Combines:
      - Binary cross-entropy for the change mask
      - Dice loss for the change mask
      - Cross-entropy for change-type classification
      - MSE for magnitude regression

    Args:
        bce_weight: Weight for BCE mask loss.
        dice_weight: Weight for Dice mask loss.
        type_weight: Weight for change-type CE.
        magnitude_weight: Weight for magnitude MSE.
    """

    def __init__(
        self,
        bce_weight: float = 0.5,
        dice_weight: float = 0.5,
        type_weight: float = 1.0,
        magnitude_weight: float = 0.5,
    ) -> None:
        super().__init__()
        self.bce_weight = bce_weight
        self.dice_weight = dice_weight
        self.type_weight = type_weight
        self.magnitude_weight = magnitude_weight

    @staticmethod
    def _binary_dice(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        pred_sig = torch.sigmoid(pred).view(-1)
        target_flat = target.view(-1)
        intersection = (pred_sig * target_flat).sum()
        return 1.0 - (2.0 * intersection + 1.0) / (pred_sig.sum() + target_flat.sum() + 1.0)

    def forward(
        self,
        outputs: dict[str, torch.Tensor],
        targets: dict[str, torch.Tensor],
    ) -> dict[str, torch.Tensor]:
        """Compute the multi-task change-detection loss.

        Args:
            outputs: Model outputs with keys ``change_mask_logits``,
                ``change_type_logits``, ``magnitude``.
            targets: Ground truth with keys ``change_mask``,
                ``change_type``, ``magnitude``.

        Returns:
            Dictionary with per-component and ``total`` loss.
        """
        mask_logits = outputs["change_mask_logits"]
        mask_target = targets["change_mask"]

        # Ensure shapes match
        if mask_logits.dim() == 4 and mask_target.dim() == 2:
            mask_target = mask_target.unsqueeze(0).unsqueeze(0)
        elif mask_logits.dim() == 4 and mask_target.dim() == 3:
            mask_target = mask_target.unsqueeze(1)

        bce = F.binary_cross_entropy_with_logits(mask_logits, mask_target.float())
        dice = self._binary_dice(mask_logits, mask_target)
        mask_loss = self.bce_weight * bce + self.dice_weight * dice

        type_loss = F.cross_entropy(
            outputs["change_type_logits"], targets["change_type"]
        )
        mag_loss = F.mse_loss(
            outputs["magnitude"].squeeze(), targets["magnitude"].float()
        )

        total = mask_loss + self.type_weight * type_loss + self.magnitude_weight * mag_loss

        return {
            "total": total,
            "mask_bce": bce,
            "mask_dice": dice,
            "type_ce": type_loss,
            "magnitude_mse": mag_loss,
        }
