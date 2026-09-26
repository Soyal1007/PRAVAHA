"""
6-class disaster classification model for NER-SHIELD.

Classes: landslide, flood, road_damage, infrastructure_damage,
vegetation_loss, normal.

Architecture:
    EfficientNet-B4 backbone (ImageNet pretrained)
    -> AdaptiveAvgPool2d -> Flatten
    -> Dropout(0.3) -> Linear(backbone_features, 512)
    -> BatchNorm1d -> ReLU -> Dropout(0.2)
    -> Linear(512, 6)
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from src.architectures.feature_extractor import FeatureExtractor
from src.utils.logger import get_logger

logger = get_logger(__name__)

CLASS_NAMES: List[str] = [
    "landslide",
    "flood",
    "road_damage",
    "infrastructure_damage",
    "vegetation_loss",
    "normal",
]

CLASS_WEIGHTS: Dict[str, float] = {
    "landslide": 2.5,
    "flood": 2.0,
    "road_damage": 3.0,
    "infrastructure_damage": 3.5,
    "vegetation_loss": 1.5,
    "normal": 0.5,
}


class ClassificationHead(nn.Module):
    """Classification head: pool -> dropout -> fc -> bn -> relu -> dropout -> fc.

    Args:
        in_features: Backbone output feature dimension.
        hidden_dim: Size of the intermediate fully-connected layer.
        num_classes: Number of output classes.
        dropout_1: Dropout probability before the hidden layer.
        dropout_2: Dropout probability before the output layer.
    """

    def __init__(
        self,
        in_features: int = 1792,
        hidden_dim: int = 512,
        num_classes: int = 6,
        dropout_1: float = 0.3,
        dropout_2: float = 0.2,
    ) -> None:
        super().__init__()
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.flatten = nn.Flatten()
        self.dropout_1 = nn.Dropout(p=dropout_1)
        self.fc1 = nn.Linear(in_features, hidden_dim)
        self.bn = nn.BatchNorm1d(hidden_dim)
        self.relu = nn.ReLU(inplace=True)
        self.dropout_2 = nn.Dropout(p=dropout_2)
        self.fc2 = nn.Linear(hidden_dim, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through the classification head.

        Args:
            x: Feature map ``(B, C, H, W)`` from the backbone.

        Returns:
            Logits ``(B, num_classes)``.
        """
        x = self.pool(x)
        x = self.flatten(x)
        x = self.dropout_1(x)
        x = self.fc1(x)
        x = self.bn(x)
        x = self.relu(x)
        x = self.dropout_2(x)
        x = self.fc2(x)
        return x


class DisasterClassifier(nn.Module):
    """End-to-end 6-class disaster classifier.

    Combines a shared :class:`FeatureExtractor` backbone with a
    :class:`ClassificationHead` to produce per-class logits.

    Args:
        backbone_name: ``timm`` model identifier for the backbone.
        pretrained: Use ImageNet-pretrained weights.
        num_classes: Number of output classes.
        hidden_dim: Hidden layer width in the classification head.
        dropout_1: Dropout after global average pooling.
        dropout_2: Dropout after the hidden layer.
        in_channels: Number of input image channels.
    """

    CLASS_NAMES = CLASS_NAMES
    CLASS_WEIGHTS = CLASS_WEIGHTS

    def __init__(
        self,
        backbone_name: str = "efficientnet_b4",
        pretrained: bool = True,
        num_classes: int = 6,
        hidden_dim: int = 512,
        dropout_1: float = 0.3,
        dropout_2: float = 0.2,
        in_channels: int = 3,
    ) -> None:
        super().__init__()
        self.num_classes = num_classes

        self.backbone = FeatureExtractor(
            backbone_name=backbone_name,
            pretrained=pretrained,
            in_channels=in_channels,
            features_only=False,
        )

        feature_dim = self.backbone.get_feature_dim()

        self.head = ClassificationHead(
            in_features=feature_dim,
            hidden_dim=hidden_dim,
            num_classes=num_classes,
            dropout_1=dropout_1,
            dropout_2=dropout_2,
        )

        total_params = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        logger.info(
            "DisasterClassifier: %.2fM params (%.2fM trainable), %d classes",
            total_params / 1e6,
            trainable / 1e6,
            num_classes,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Produce class logits for a batch of images.

        Args:
            x: Input images ``(B, 3, H, W)``.

        Returns:
            Logits ``(B, num_classes)``.
        """
        features = self.backbone(x)
        logits = self.head(features)
        return logits

    def predict(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Run inference and return class predictions with probabilities.

        Args:
            x: Input images ``(B, 3, H, W)``.

        Returns:
            Dictionary with keys:
            - ``logits``: raw logits ``(B, num_classes)``
            - ``probabilities``: softmax probabilities ``(B, num_classes)``
            - ``predicted_class``: integer class indices ``(B,)``
            - ``confidence``: confidence of the predicted class ``(B,)``
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = F.softmax(logits, dim=1)
            confidence, predicted = torch.max(probs, dim=1)
        return {
            "logits": logits,
            "probabilities": probs,
            "predicted_class": predicted,
            "confidence": confidence,
        }

    def get_class_weights_tensor(self, device: torch.device) -> torch.Tensor:
        """Return the class weight vector as a tensor on *device*.

        Args:
            device: Target device for the tensor.

        Returns:
            Tensor of shape ``(num_classes,)``.
        """
        weights = [self.CLASS_WEIGHTS[name] for name in self.CLASS_NAMES]
        return torch.tensor(weights, dtype=torch.float32, device=device)

    def export_onnx(
        self,
        save_path: str,
        input_size: Tuple[int, int] = (512, 512),
        opset_version: int = 17,
    ) -> None:
        """Export the model to ONNX format.

        Args:
            save_path: Destination ``.onnx`` file path.
            input_size: ``(H, W)`` of the dummy input.
            opset_version: ONNX opset version.
        """
        self.eval()
        dummy = torch.randn(1, 3, *input_size, device=next(self.parameters()).device)
        torch.onnx.export(
            self,
            dummy,
            save_path,
            opset_version=opset_version,
            input_names=["input"],
            output_names=["logits"],
            dynamic_axes={
                "input": {0: "batch_size", 2: "height", 3: "width"},
                "logits": {0: "batch_size"},
            },
        )
        logger.info("Exported classification model to ONNX: %s", save_path)
