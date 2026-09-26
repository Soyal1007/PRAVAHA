"""
Shared feature extractor backbone for NER-SHIELD.

Provides a configurable EfficientNet-B4 (or ResNet-50) backbone that
extracts multi-scale features used across classification, change
detection, and anomaly detection tasks.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import timm

from src.utils.logger import get_logger

logger = get_logger(__name__)


class FeatureExtractor(nn.Module):
    """Shared pretrained backbone for multi-task feature extraction.

    Wraps a ``timm`` model to expose both the final feature vector
    (for classification) and intermediate feature maps (for dense
    prediction heads).

    Args:
        backbone_name: ``timm`` model identifier.
            Defaults to ``"efficientnet_b4"``.
        pretrained: Load ImageNet-pretrained weights.
        in_channels: Number of input channels (3 for RGB).
        drop_rate: Classifier dropout rate (set on the ``timm`` model).
        drop_path_rate: Stochastic depth rate.
        features_only: If *True* the model returns multi-scale feature
            maps instead of a single feature vector.
        out_indices: Which feature levels to return when
            ``features_only=True``.  ``None`` returns all available levels.
    """

    # Map of backbone name -> final feature dimension (for head sizing)
    FEATURE_DIMS: Dict[str, int] = {
        "efficientnet_b4": 1792,
        "efficientnet_b3": 1536,
        "efficientnet_b2": 1408,
        "resnet50": 2048,
        "resnet34": 512,
    }

    def __init__(
        self,
        backbone_name: str = "efficientnet_b4",
        pretrained: bool = True,
        in_channels: int = 3,
        drop_rate: float = 0.2,
        drop_path_rate: float = 0.2,
        features_only: bool = False,
        out_indices: Optional[Tuple[int, ...]] = None,
    ) -> None:
        super().__init__()
        self.backbone_name = backbone_name
        self._features_only = features_only

        if features_only:
            kwargs = dict(
                model_name=backbone_name,
                pretrained=pretrained,
                in_chans=in_channels,
                features_only=True,
                drop_rate=drop_rate,
                drop_path_rate=drop_path_rate,
            )
            if out_indices is not None:
                kwargs["out_indices"] = list(out_indices)
            self.backbone = timm.create_model(**kwargs)
            self.feature_channels: List[int] = self.backbone.feature_info.channels()
            self.feature_dim = self.feature_channels[-1]
            logger.info(
                "FeatureExtractor (%s) multi-scale channels: %s",
                backbone_name,
                self.feature_channels,
            )
        else:
            self.backbone = timm.create_model(
                model_name=backbone_name,
                pretrained=pretrained,
                in_chans=in_channels,
                num_classes=0,  # remove classifier head
                drop_rate=drop_rate,
                drop_path_rate=drop_path_rate,
                global_pool="",  # no global pooling — caller decides
            )
            self.feature_dim = self.FEATURE_DIMS.get(backbone_name, 1792)
            self.feature_channels = []

        param_count = sum(p.numel() for p in self.parameters())
        logger.info(
            "FeatureExtractor (%s, pretrained=%s): %.2fM parameters, feature_dim=%d",
            backbone_name,
            pretrained,
            param_count / 1e6,
            self.feature_dim,
        )

    def forward(
        self, x: torch.Tensor
    ) -> torch.Tensor | List[torch.Tensor]:
        """Extract features from the input tensor.

        Args:
            x: Input tensor ``(B, C, H, W)``.

        Returns:
            If ``features_only`` is *False*: feature tensor ``(B, D, h, w)``.
            If ``features_only`` is *True*: list of multi-scale feature
            tensors.
        """
        return self.backbone(x)

    def freeze_bn(self) -> None:
        """Set all BatchNorm layers to eval mode (frozen running stats)."""
        for module in self.modules():
            if isinstance(module, (nn.BatchNorm2d, nn.SyncBatchNorm)):
                module.eval()

    def unfreeze(self) -> None:
        """Unfreeze all parameters."""
        for param in self.parameters():
            param.requires_grad = True

    def freeze_up_to(self, layer_name: str) -> int:
        """Freeze parameters up to and including *layer_name*.

        Args:
            layer_name: Substring matched against parameter names.

        Returns:
            Number of parameters frozen.
        """
        frozen = 0
        freeze = True
        for name, param in self.named_parameters():
            if freeze:
                param.requires_grad = False
                frozen += param.numel()
            if layer_name in name:
                freeze = False
        logger.info("Froze %d parameters up to '%s'", frozen, layer_name)
        return frozen

    def get_feature_dim(self) -> int:
        """Return the dimensionality of the final feature map channel."""
        return self.feature_dim
