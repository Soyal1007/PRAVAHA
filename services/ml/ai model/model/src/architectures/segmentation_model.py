"""
Semantic segmentation model for NER-SHIELD.

U-Net++ with EfficientNet-B4 encoder via ``segmentation_models_pytorch``.

Classes (5): background, landslide_scar, flood_water, damaged_road,
damaged_structure.

Loss: 0.5 * Dice + 0.5 * Focal.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
import segmentation_models_pytorch as smp

from src.utils.logger import get_logger

logger = get_logger(__name__)

SEG_CLASS_NAMES: List[str] = [
    "background",
    "landslide_scar",
    "flood_water",
    "damaged_road",
    "damaged_structure",
]


class SegmentationModel(nn.Module):
    """U-Net++ segmentation model with EfficientNet-B4 encoder.

    Wraps ``segmentation_models_pytorch.UnetPlusPlus`` and adds
    convenience methods for inference and ONNX export.

    Args:
        encoder_name: Name of the encoder backbone.
        encoder_weights: Pretrained weights identifier (e.g. ``"imagenet"``).
        in_channels: Number of input image channels.
        num_classes: Number of segmentation classes.
        decoder_channels: Channel widths for each decoder stage.
        decoder_attention_type: Attention type in the decoder
            (``"scse"`` by default).
        activation: Final activation.  ``None`` returns raw logits.
    """

    CLASS_NAMES = SEG_CLASS_NAMES

    def __init__(
        self,
        encoder_name: str = "efficientnet-b4",
        encoder_weights: Optional[str] = "imagenet",
        in_channels: int = 3,
        num_classes: int = 5,
        decoder_channels: Tuple[int, ...] = (256, 128, 64, 32, 16),
        decoder_attention_type: Optional[str] = "scse",
        activation: Optional[str] = None,
    ) -> None:
        super().__init__()
        self.num_classes = num_classes

        self.model = smp.UnetPlusPlus(
            encoder_name=encoder_name,
            encoder_weights=encoder_weights,
            in_channels=in_channels,
            classes=num_classes,
            decoder_channels=list(decoder_channels),
            decoder_attention_type=decoder_attention_type,
            activation=activation,
        )

        # Auxiliary classification head for deep supervision
        encoder_out_channels = self.model.encoder.out_channels[-1]
        self.aux_head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(encoder_out_channels, num_classes),
        )

        total_params = sum(p.numel() for p in self.parameters())
        logger.info(
            "SegmentationModel (UNet++ / %s): %.2fM params, %d classes",
            encoder_name,
            total_params / 1e6,
            num_classes,
        )

    def forward(
        self, x: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """Forward pass returning segmentation logits and auxiliary output.

        Args:
            x: Input images ``(B, 3, H, W)``.

        Returns:
            Dictionary with:
            - ``mask_logits``: ``(B, num_classes, H, W)``
            - ``aux_logits``: ``(B, num_classes)`` from the auxiliary head
        """
        features = self.model.encoder(x)
        decoder_output = self.model.decoder(*features)
        mask_logits = self.model.segmentation_head(decoder_output)

        # Auxiliary classification from deepest encoder feature
        aux_logits = self.aux_head(features[-1])

        return {
            "mask_logits": mask_logits,
            "aux_logits": aux_logits,
        }

    def predict(
        self,
        x: torch.Tensor,
        threshold: float = 0.5,
    ) -> Dict[str, torch.Tensor]:
        """Run inference and return predicted masks.

        Args:
            x: Input images ``(B, 3, H, W)``.
            threshold: Not used for multi-class (argmax), kept for API
                consistency with binary tasks.

        Returns:
            Dictionary with:
            - ``mask_logits``: raw logits
            - ``mask_probs``: per-pixel class probabilities
            - ``mask_pred``: integer class-index mask ``(B, H, W)``
        """
        self.eval()
        with torch.no_grad():
            outputs = self.forward(x)
            mask_logits = outputs["mask_logits"]
            mask_probs = F.softmax(mask_logits, dim=1)
            mask_pred = torch.argmax(mask_probs, dim=1)

        return {
            "mask_logits": mask_logits,
            "mask_probs": mask_probs,
            "mask_pred": mask_pred,
        }

    def get_encoder(self) -> nn.Module:
        """Return the underlying encoder for transfer or inspection."""
        return self.model.encoder

    def freeze_encoder(self) -> None:
        """Freeze all encoder parameters."""
        for param in self.model.encoder.parameters():
            param.requires_grad = False
        logger.info("Encoder parameters frozen")

    def unfreeze_encoder(self) -> None:
        """Unfreeze all encoder parameters."""
        for param in self.model.encoder.parameters():
            param.requires_grad = True
        logger.info("Encoder parameters unfrozen")

    def export_onnx(
        self,
        save_path: str,
        input_size: Tuple[int, int] = (512, 512),
        opset_version: int = 17,
    ) -> None:
        """Export to ONNX.

        Args:
            save_path: Destination ``.onnx`` file path.
            input_size: ``(H, W)`` of the dummy input.
            opset_version: ONNX opset version.
        """
        self.eval()
        device = next(self.parameters()).device
        dummy = torch.randn(1, 3, *input_size, device=device)

        # ONNX export needs a single tensor output; use only the mask logits.
        class _Wrapper(nn.Module):
            def __init__(self, model: "SegmentationModel") -> None:
                super().__init__()
                self.model = model

            def forward(self, x: torch.Tensor) -> torch.Tensor:
                return self.model.forward(x)["mask_logits"]

        wrapper = _Wrapper(self)
        torch.onnx.export(
            wrapper,
            dummy,
            save_path,
            opset_version=opset_version,
            input_names=["input"],
            output_names=["mask_logits"],
            dynamic_axes={
                "input": {0: "batch_size", 2: "height", 3: "width"},
                "mask_logits": {0: "batch_size", 2: "height", 3: "width"},
            },
        )
        logger.info("Exported segmentation model to ONNX: %s", save_path)
