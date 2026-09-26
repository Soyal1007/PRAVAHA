"""
Siamese change-detection network for NER-SHIELD.

Takes a *before* and *after* satellite image pair and produces:
  - Binary change mask
  - Change-type classification per region
  - Magnitude score (0-100)
  - Affected area in km^2

Architecture:
  - Shared EfficientNet-B4 encoder (Siamese weight-sharing)
  - Concatenation + learned channel-spatial attention fusion
  - FPN decoder -> per-pixel change predictions
  - Global head for magnitude and change-type classification
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

from src.utils.logger import get_logger

logger = get_logger(__name__)


class ChannelSpatialAttention(nn.Module):
    """Combined channel and spatial attention block.

    Applies channel attention (squeeze-excitation) followed by spatial
    attention to refine fused feature maps.

    Args:
        channels: Number of input channels.
        reduction: Channel reduction ratio for SE attention.
    """

    def __init__(self, channels: int, reduction: int = 16) -> None:
        super().__init__()
        # Channel attention (SE)
        self.channel_pool = nn.AdaptiveAvgPool2d(1)
        self.channel_fc = nn.Sequential(
            nn.Linear(channels, channels // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, channels, bias=False),
            nn.Sigmoid(),
        )
        # Spatial attention
        self.spatial_conv = nn.Sequential(
            nn.Conv2d(2, 1, kernel_size=7, padding=3, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Apply channel then spatial attention.

        Args:
            x: Feature tensor ``(B, C, H, W)``.

        Returns:
            Refined tensor with the same shape.
        """
        b, c, h, w = x.shape

        # Channel attention
        ca = self.channel_pool(x).view(b, c)
        ca = self.channel_fc(ca).view(b, c, 1, 1)
        x = x * ca

        # Spatial attention
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        sa = self.spatial_conv(torch.cat([avg_out, max_out], dim=1))
        x = x * sa

        return x


class FPNDecoder(nn.Module):
    """Feature Pyramid Network decoder for multi-scale feature fusion.

    Args:
        encoder_channels: List of channel counts from each encoder stage
            (coarse to fine is expected as the *reversed* internal order).
        out_channels: Unified channel count for FPN outputs.
        num_classes: Number of output segmentation classes (for the change mask).
    """

    def __init__(
        self,
        encoder_channels: List[int],
        out_channels: int = 256,
        num_classes: int = 1,
    ) -> None:
        super().__init__()
        self.lateral_convs = nn.ModuleList()
        self.output_convs = nn.ModuleList()

        for ch in encoder_channels:
            self.lateral_convs.append(
                nn.Conv2d(ch, out_channels, kernel_size=1)
            )
            self.output_convs.append(
                nn.Sequential(
                    nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
                    nn.BatchNorm2d(out_channels),
                    nn.ReLU(inplace=True),
                )
            )

        self.final_conv = nn.Sequential(
            nn.Conv2d(out_channels, out_channels // 2, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels // 2),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels // 2, num_classes, kernel_size=1),
        )

    def forward(self, features: List[torch.Tensor]) -> torch.Tensor:
        """Fuse multi-scale features into a single prediction map.

        Args:
            features: List of feature maps from coarse (small spatial) to fine
                (large spatial).

        Returns:
            Prediction logits at the resolution of the finest feature map.
        """
        # Build top-down pathway
        laterals = [conv(f) for conv, f in zip(self.lateral_convs, features)]

        for i in range(len(laterals) - 2, -1, -1):
            upsampled = F.interpolate(
                laterals[i + 1],
                size=laterals[i].shape[2:],
                mode="bilinear",
                align_corners=False,
            )
            laterals[i] = laterals[i] + upsampled

        outputs = [conv(lat) for conv, lat in zip(self.output_convs, laterals)]

        # Upsample all to finest resolution and average
        target_size = outputs[0].shape[2:]
        fused = outputs[0]
        for out in outputs[1:]:
            fused = fused + F.interpolate(
                out, size=target_size, mode="bilinear", align_corners=False
            )
        fused = fused / len(outputs)

        return self.final_conv(fused)


class ChangeDetectionNet(nn.Module):
    """Siamese change-detection network.

    Args:
        encoder_name: ``timm`` backbone identifier.
        pretrained: Use ImageNet weights.
        in_channels: Number of input channels per image.
        fpn_out_channels: FPN lateral channel count.
        num_change_types: Number of change-type categories.
    """

    CHANGE_TYPE_NAMES: List[str] = [
        "landslide",
        "flood",
        "road_damage",
        "infrastructure_damage",
        "vegetation_loss",
        "normal",
    ]

    def __init__(
        self,
        encoder_name: str = "efficientnet_b4",
        pretrained: bool = True,
        in_channels: int = 3,
        fpn_out_channels: int = 256,
        num_change_types: int = 6,
    ) -> None:
        super().__init__()
        self.num_change_types = num_change_types

        # Shared Siamese encoder (features_only for multi-scale maps)
        self.encoder = timm.create_model(
            encoder_name,
            pretrained=pretrained,
            in_chans=in_channels,
            features_only=True,
            drop_rate=0.2,
            drop_path_rate=0.2,
        )
        encoder_channels: List[int] = self.encoder.feature_info.channels()

        # Fusion layers: concatenated features -> fused features
        self.fusion_convs = nn.ModuleList()
        self.attention_blocks = nn.ModuleList()
        for ch in encoder_channels:
            self.fusion_convs.append(
                nn.Sequential(
                    nn.Conv2d(ch * 2, ch, kernel_size=1, bias=False),
                    nn.BatchNorm2d(ch),
                    nn.ReLU(inplace=True),
                )
            )
            self.attention_blocks.append(ChannelSpatialAttention(ch))

        # FPN decoder for change mask prediction
        # Reverse so coarsest is first in the list passed to FPN
        self.fpn = FPNDecoder(
            encoder_channels=encoder_channels,
            out_channels=fpn_out_channels,
            num_classes=1,  # binary change mask
        )

        # Global heads for change-type classification and magnitude
        deepest_ch = encoder_channels[-1]
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.change_type_head = nn.Sequential(
            nn.Linear(deepest_ch, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_change_types),
        )
        self.magnitude_head = nn.Sequential(
            nn.Linear(deepest_ch, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, 1),
            nn.Sigmoid(),  # output in [0, 1], scaled to 0-100 at inference
        )

        total_params = sum(p.numel() for p in self.parameters())
        logger.info(
            "ChangeDetectionNet (%s): %.2fM params, %d change types",
            encoder_name,
            total_params / 1e6,
            num_change_types,
        )

    def _encode_and_fuse(
        self,
        before: torch.Tensor,
        after: torch.Tensor,
    ) -> Tuple[List[torch.Tensor], torch.Tensor]:
        """Encode both images and fuse multi-scale features.

        Returns:
            ``(fused_features_list, deepest_fused_feature)``
        """
        feats_before = self.encoder(before)
        feats_after = self.encoder(after)

        fused = []
        for i, (fb, fa) in enumerate(zip(feats_before, feats_after)):
            concat = torch.cat([fb, fa], dim=1)
            merged = self.fusion_convs[i](concat)
            attended = self.attention_blocks[i](merged)
            fused.append(attended)

        return fused, fused[-1]

    def forward(
        self,
        before: torch.Tensor,
        after: torch.Tensor,
    ) -> Dict[str, torch.Tensor]:
        """Forward pass for a before/after image pair.

        Args:
            before: Pre-event image ``(B, 3, H, W)``.
            after: Post-event image ``(B, 3, H, W)``.

        Returns:
            Dictionary with:
            - ``change_mask_logits``: ``(B, 1, H', W')`` binary change logits
            - ``change_type_logits``: ``(B, num_change_types)``
            - ``magnitude``: ``(B, 1)`` in ``[0, 1]``
        """
        fused_features, deepest = self._encode_and_fuse(before, after)

        # Change mask via FPN
        change_mask_logits = self.fpn(fused_features)
        # Upsample to input resolution
        change_mask_logits = F.interpolate(
            change_mask_logits,
            size=before.shape[2:],
            mode="bilinear",
            align_corners=False,
        )

        # Global features for classification and magnitude
        global_feat = self.global_pool(deepest).flatten(1)
        change_type_logits = self.change_type_head(global_feat)
        magnitude = self.magnitude_head(global_feat)

        return {
            "change_mask_logits": change_mask_logits,
            "change_type_logits": change_type_logits,
            "magnitude": magnitude,
        }

    def predict(
        self,
        before: torch.Tensor,
        after: torch.Tensor,
        threshold: float = 0.5,
        gsd_meters: float = 10.0,
    ) -> Dict[str, torch.Tensor | float]:
        """Run inference and return decoded predictions.

        Args:
            before: Pre-event image ``(B, 3, H, W)``.
            after: Post-event image ``(B, 3, H, W)``.
            threshold: Threshold for binarising the change mask.
            gsd_meters: Ground sampling distance for area computation.

        Returns:
            Dictionary with decoded outputs including change mask, type,
            magnitude score (0-100), and affected area in km^2.
        """
        self.eval()
        with torch.no_grad():
            outputs = self.forward(before, after)

            mask_prob = torch.sigmoid(outputs["change_mask_logits"])
            mask_binary = (mask_prob > threshold).float()

            type_probs = F.softmax(outputs["change_type_logits"], dim=1)
            type_pred = torch.argmax(type_probs, dim=1)

            magnitude_score = outputs["magnitude"] * 100.0

            # Affected area per sample
            pixel_counts = mask_binary.sum(dim=(1, 2, 3))
            area_km2 = pixel_counts * (gsd_meters ** 2) / 1_000_000.0

        return {
            "change_mask_prob": mask_prob,
            "change_mask": mask_binary,
            "change_type_probs": type_probs,
            "change_type": type_pred,
            "magnitude_score": magnitude_score,
            "affected_area_km2": area_km2,
        }

    def export_onnx(
        self,
        save_path: str,
        input_size: Tuple[int, int] = (512, 512),
        opset_version: int = 17,
    ) -> None:
        """Export the model to ONNX.

        Because the model takes two inputs, a thin wrapper is used.

        Args:
            save_path: Destination ``.onnx`` file.
            input_size: ``(H, W)`` spatial dimensions.
            opset_version: ONNX opset version.
        """
        self.eval()
        device = next(self.parameters()).device

        class _Wrapper(nn.Module):
            def __init__(self, net: "ChangeDetectionNet") -> None:
                super().__init__()
                self.net = net

            def forward(
                self, before: torch.Tensor, after: torch.Tensor
            ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
                out = self.net(before, after)
                return (
                    out["change_mask_logits"],
                    out["change_type_logits"],
                    out["magnitude"],
                )

        wrapper = _Wrapper(self)
        dummy_before = torch.randn(1, 3, *input_size, device=device)
        dummy_after = torch.randn(1, 3, *input_size, device=device)
        torch.onnx.export(
            wrapper,
            (dummy_before, dummy_after),
            save_path,
            opset_version=opset_version,
            input_names=["before", "after"],
            output_names=["change_mask", "change_type", "magnitude"],
            dynamic_axes={
                "before": {0: "batch_size", 2: "height", 3: "width"},
                "after": {0: "batch_size", 2: "height", 3: "width"},
                "change_mask": {0: "batch_size", 2: "height", 3: "width"},
                "change_type": {0: "batch_size"},
                "magnitude": {0: "batch_size"},
            },
        )
        logger.info("Exported change detection model to ONNX: %s", save_path)
