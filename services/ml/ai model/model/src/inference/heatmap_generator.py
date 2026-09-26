"""
Grad-CAM heatmap generator for NER-SHIELD.

Produces class-activation heatmaps that highlight the regions of a
satellite image most influential for the classifier's decision.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from src.utils.logger import get_logger

logger = get_logger(__name__)

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class _GradCAM:
    """Minimal Grad-CAM implementation that does not depend on external
    ``pytorch-grad-cam`` at runtime.

    Registers forward and backward hooks on a chosen convolutional
    layer to capture activations and gradients, then computes the
    class-discriminative heatmap.

    Args:
        model: The classification model.
        target_layer: The convolutional layer to visualise.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module) -> None:
        self.model = model
        self.target_layer = target_layer
        self._activations: Optional[torch.Tensor] = None
        self._gradients: Optional[torch.Tensor] = None

        self._fwd_hook = target_layer.register_forward_hook(self._save_activation)
        self._bwd_hook = target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(
        self, module: nn.Module, inp: Any, out: torch.Tensor
    ) -> None:
        self._activations = out.detach()

    def _save_gradient(
        self, module: nn.Module, grad_input: Any, grad_output: Any
    ) -> None:
        self._gradients = grad_output[0].detach()

    def __call__(
        self,
        input_tensor: torch.Tensor,
        target_class: Optional[int] = None,
    ) -> np.ndarray:
        """Generate a Grad-CAM heatmap.

        Args:
            input_tensor: Model input ``(1, 3, H, W)``.
            target_class: Class index to explain.  *None* uses the
                predicted class.

        Returns:
            Heatmap ``(H, W)`` in ``[0, 1]``.
        """
        self.model.eval()
        input_tensor.requires_grad_(True)
        output = self.model(input_tensor)

        if target_class is None:
            target_class = int(output.argmax(dim=1).item())

        self.model.zero_grad()
        one_hot = torch.zeros_like(output)
        one_hot[0, target_class] = 1.0
        output.backward(gradient=one_hot, retain_graph=True)

        if self._gradients is None or self._activations is None:
            logger.warning("Grad-CAM: hooks did not capture data")
            return np.zeros(
                (input_tensor.shape[2], input_tensor.shape[3]), dtype=np.float32
            )

        # Channel-wise weight = global average of gradients
        weights = self._gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self._activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = cam[0, 0].cpu().numpy()

        # Normalise to [0, 1]
        cam_min, cam_max = cam.min(), cam.max()
        if cam_max - cam_min > 1e-8:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        # Upsample to input resolution
        cam = cv2.resize(
            cam,
            (input_tensor.shape[3], input_tensor.shape[2]),
            interpolation=cv2.INTER_LINEAR,
        )
        return cam

    def remove_hooks(self) -> None:
        """Remove registered hooks."""
        self._fwd_hook.remove()
        self._bwd_hook.remove()


class HeatmapGenerator:
    """High-level heatmap generator for the disaster classifier.

    Automatically identifies the last convolutional layer in the
    backbone and uses Grad-CAM to produce heatmaps.

    Args:
        model: The :class:`DisasterClassifier` model.
        device: Torch device.
        image_size: Model input spatial size.
    """

    def __init__(
        self,
        model: nn.Module,
        device: torch.device,
        image_size: int = 512,
    ) -> None:
        self.model = model.to(device)
        self.device = device
        self.image_size = image_size

        target_layer = self._find_last_conv(model)
        self._gradcam = _GradCAM(model, target_layer)
        logger.info(
            "HeatmapGenerator: target layer = %s",
            target_layer.__class__.__name__,
        )

    @staticmethod
    def _find_last_conv(model: nn.Module) -> nn.Module:
        """Walk the model and return the last Conv2d layer."""
        last_conv: Optional[nn.Module] = None
        for module in model.modules():
            if isinstance(module, nn.Conv2d):
                last_conv = module
        if last_conv is None:
            raise ValueError("No Conv2d layer found in the model")
        return last_conv

    def _preprocess(self, image: np.ndarray) -> torch.Tensor:
        img = cv2.resize(
            image, (self.image_size, self.image_size),
            interpolation=cv2.INTER_LINEAR,
        )
        img = img.astype(np.float32) / 255.0
        img = (img - MEAN) / STD
        return torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0).to(self.device)

    def generate(
        self,
        image: np.ndarray,
        target_class: Optional[int] = None,
    ) -> np.ndarray:
        """Generate a Grad-CAM heatmap for a single image.

        Args:
            image: RGB ``uint8`` image ``(H, W, 3)``.
            target_class: Class index to explain.

        Returns:
            Heatmap array ``(H, W)`` in ``[0, 1]``, at the original
            image resolution.
        """
        tensor = self._preprocess(image)
        cam = self._gradcam(tensor, target_class)

        # Resize to original image dimensions
        original_h, original_w = image.shape[:2]
        cam = cv2.resize(cam, (original_w, original_h), interpolation=cv2.INTER_LINEAR)
        return cam

    def generate_overlay(
        self,
        image: np.ndarray,
        target_class: Optional[int] = None,
        alpha: float = 0.4,
        colormap: int = cv2.COLORMAP_JET,
    ) -> np.ndarray:
        """Generate a heatmap blended onto the original image.

        Args:
            image: RGB ``uint8`` image ``(H, W, 3)``.
            target_class: Class index to explain.
            alpha: Heatmap opacity.
            colormap: OpenCV colourmap.

        Returns:
            Blended RGB ``uint8`` image.
        """
        from src.utils.visualization import Visualizer

        cam = self.generate(image, target_class)
        return Visualizer.overlay_heatmap(image, cam, alpha=alpha, colormap=colormap)

    def generate_multi_class(
        self,
        image: np.ndarray,
        class_names: List[str],
    ) -> Dict[str, np.ndarray]:
        """Generate Grad-CAM heatmaps for every class.

        Args:
            image: RGB ``uint8`` image ``(H, W, 3)``.
            class_names: Ordered list of class names.

        Returns:
            Mapping of class name to heatmap array.
        """
        heatmaps: Dict[str, np.ndarray] = {}
        for idx, name in enumerate(class_names):
            heatmaps[name] = self.generate(image, target_class=idx)
        return heatmaps

    def cleanup(self) -> None:
        """Remove hooks from the model."""
        self._gradcam.remove_hooks()
