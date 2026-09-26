"""
Before/after temporal change analysis for NER-SHIELD.

Takes a pair of satellite images (before and after a potential
disaster event) and runs the Siamese change-detection network,
producing a change mask, change-type classification, magnitude
score, affected area, and side-by-side visualisation.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn.functional as F

from src.architectures.change_detection_net import ChangeDetectionNet
from src.utils.geo_utils import GeoUtils
from src.utils.visualization import Visualizer
from src.utils.logger import get_logger

logger = get_logger(__name__)

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _preprocess(image: np.ndarray, size: int) -> torch.Tensor:
    """Resize, normalise, and convert to tensor."""
    img = cv2.resize(image, (size, size), interpolation=cv2.INTER_LINEAR)
    img = img.astype(np.float32) / 255.0
    img = (img - MEAN) / STD
    return torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0)


class BeforeAfterAnalyzer:
    """Temporal change analysis using the Siamese change-detection model.

    Args:
        model: A :class:`ChangeDetectionNet` instance.
        device: Torch device.
        image_size: Input spatial size for the model.
        gsd_meters: Ground sampling distance for area computation.
    """

    CHANGE_TYPE_NAMES: List[str] = [
        "landslide", "flood", "road_damage",
        "infrastructure_damage", "vegetation_loss", "normal",
    ]

    def __init__(
        self,
        model: ChangeDetectionNet,
        device: torch.device,
        image_size: int = 512,
        gsd_meters: float = 10.0,
    ) -> None:
        self.model = model.to(device).eval()
        self.device = device
        self.image_size = image_size
        self.geo = GeoUtils(default_gsd=gsd_meters)

    @classmethod
    def from_checkpoint(
        cls,
        weights_path: str,
        device: str = "auto",
        image_size: int = 512,
        gsd_meters: float = 10.0,
    ) -> "BeforeAfterAnalyzer":
        """Create an analyzer from a saved checkpoint.

        Args:
            weights_path: Path to ``change_detection_best.pth``.
            device: ``"auto"``, ``"cuda"``, or ``"cpu"``.
            image_size: Model input spatial size.
            gsd_meters: GSD for area calculation.

        Returns:
            Initialised :class:`BeforeAfterAnalyzer`.
        """
        if device == "auto":
            dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            dev = torch.device(device)

        model = ChangeDetectionNet(pretrained=False)
        ckpt = torch.load(weights_path, map_location=dev)
        model.load_state_dict(ckpt["model_state_dict"])
        logger.info("ChangeDetectionNet loaded from %s", weights_path)
        return cls(model, dev, image_size, gsd_meters)

    # -----------------------------------------------------------------
    # Analysis
    # -----------------------------------------------------------------

    @torch.no_grad()
    def analyze(
        self,
        before: np.ndarray,
        after: np.ndarray,
        threshold: float = 0.5,
    ) -> Dict[str, Any]:
        """Run change detection on a before/after pair.

        Args:
            before: RGB ``uint8`` pre-event image ``(H, W, 3)``.
            after: RGB ``uint8`` post-event image ``(H, W, 3)``.
            threshold: Binary threshold for the change mask.

        Returns:
            Dictionary with:
            - ``change_mask``: binary mask ``(H, W)``
            - ``change_mask_prob``: probability mask ``(H, W)``
            - ``change_type``: predicted change-type string
            - ``change_type_probs``: per-type probabilities dict
            - ``magnitude_score``: 0-100 float
            - ``affected_area_km2``: float
            - ``change_percentage``: fraction of image changed
        """
        original_h, original_w = before.shape[:2]

        before_t = _preprocess(before, self.image_size).to(self.device)
        after_t = _preprocess(after, self.image_size).to(self.device)

        outputs = self.model(before_t, after_t)

        # Change mask
        mask_prob = torch.sigmoid(outputs["change_mask_logits"])[0, 0]
        mask_prob_np = mask_prob.cpu().numpy()
        mask_binary = (mask_prob_np > threshold).astype(np.uint8)

        # Resize to original dimensions
        mask_prob_original = cv2.resize(
            mask_prob_np, (original_w, original_h), interpolation=cv2.INTER_LINEAR
        )
        mask_binary_original = cv2.resize(
            mask_binary, (original_w, original_h), interpolation=cv2.INTER_NEAREST
        )

        # Change type
        type_probs = F.softmax(outputs["change_type_logits"], dim=1)[0]
        type_probs_np = type_probs.cpu().numpy()
        type_idx = int(type_probs_np.argmax())
        change_type = self.CHANGE_TYPE_NAMES[type_idx]
        type_probs_dict = {
            name: round(float(type_probs_np[i]), 4)
            for i, name in enumerate(self.CHANGE_TYPE_NAMES)
        }

        # Magnitude
        magnitude = float(outputs["magnitude"][0].item()) * 100.0

        # Area
        affected_area = self.geo.mask_to_area_km2(mask_binary_original)
        total_pixels = original_h * original_w
        change_percentage = float(mask_binary_original.sum()) / total_pixels * 100.0

        result = {
            "change_mask": mask_binary_original,
            "change_mask_prob": mask_prob_original,
            "change_type": change_type,
            "change_type_probs": type_probs_dict,
            "magnitude_score": round(magnitude, 2),
            "affected_area_km2": round(affected_area, 4),
            "change_percentage": round(change_percentage, 2),
        }

        logger.info(
            "Change analysis: type=%s, magnitude=%.1f, area=%.4f km2, changed=%.1f%%",
            change_type, magnitude, affected_area, change_percentage,
        )
        return result

    def analyze_from_paths(
        self,
        before_path: str,
        after_path: str,
        threshold: float = 0.5,
    ) -> Dict[str, Any]:
        """Run analysis on image files.

        Args:
            before_path: Path to the pre-event image.
            after_path: Path to the post-event image.
            threshold: Change mask binarisation threshold.

        Returns:
            Analysis result dictionary.
        """
        before = cv2.cvtColor(cv2.imread(before_path), cv2.COLOR_BGR2RGB)
        after = cv2.cvtColor(cv2.imread(after_path), cv2.COLOR_BGR2RGB)
        result = self.analyze(before, after, threshold)
        result["before_path"] = before_path
        result["after_path"] = after_path
        return result

    # -----------------------------------------------------------------
    # Visualisation
    # -----------------------------------------------------------------

    def visualize(
        self,
        before: np.ndarray,
        after: np.ndarray,
        result: Dict[str, Any],
        save_path: Optional[str] = None,
    ) -> np.ndarray:
        """Create a side-by-side comparison figure.

        Args:
            before: Pre-event image.
            after: Post-event image.
            result: Output of :meth:`analyze`.
            save_path: Optional save path.

        Returns:
            Rendered comparison as an RGB array.
        """
        change_mask = result.get("change_mask")
        title_after = (
            f"After (type: {result['change_type']}, "
            f"mag: {result['magnitude_score']:.0f})"
        )
        return Visualizer.side_by_side(
            before, after,
            change_mask=change_mask,
            title_before="Before",
            title_after=title_after,
            save_path=save_path,
        )

    def generate_change_report(
        self,
        before: np.ndarray,
        after: np.ndarray,
        threshold: float = 0.5,
    ) -> Dict[str, Any]:
        """Full change report with analysis and visualisation.

        Args:
            before: Pre-event image.
            after: Post-event image.
            threshold: Change mask binarisation threshold.

        Returns:
            Report dictionary with analysis results and rendered
            visualisation array under ``"visualization"``.
        """
        result = self.analyze(before, after, threshold)
        viz = self.visualize(before, after, result)
        result["visualization"] = viz
        return result
