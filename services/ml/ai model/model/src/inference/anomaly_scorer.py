"""
Anomaly scoring pipeline for NER-SHIELD.

Wraps the VAE anomaly detector to provide a clean interface for
computing per-pixel and overall anomaly scores, calibrating thresholds,
and converting scores into actionable severity levels.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import torch

from src.architectures.anomaly_detector import AnomalyDetectorVAE
from src.utils.logger import get_logger

logger = get_logger(__name__)


class AnomalyScorer:
    """Anomaly scoring pipeline built on top of the VAE detector.

    Args:
        model: Trained :class:`AnomalyDetectorVAE` instance.
        device: Torch device.
        input_size: Square image size expected by the VAE.
    """

    def __init__(
        self,
        model: AnomalyDetectorVAE,
        device: torch.device,
        input_size: int = 256,
    ) -> None:
        self.model = model.to(device).eval()
        self.device = device
        self.input_size = input_size
        self._threshold: float = float(model.anomaly_threshold.item())
        logger.info(
            "AnomalyScorer ready (input=%d, threshold=%.2f)",
            input_size,
            self._threshold,
        )

    @classmethod
    def from_checkpoint(
        cls,
        weights_path: str,
        device: str = "auto",
        latent_dim: int = 256,
        input_size: int = 256,
    ) -> "AnomalyScorer":
        """Load an anomaly scorer from a checkpoint.

        Args:
            weights_path: Path to ``anomaly_detector_best.pth``.
            device: ``"auto"``, ``"cuda"``, or ``"cpu"``.
            latent_dim: VAE latent dimension.
            input_size: Model input size.

        Returns:
            Initialised :class:`AnomalyScorer`.
        """
        if device == "auto":
            dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            dev = torch.device(device)

        model = AnomalyDetectorVAE(
            latent_dim=latent_dim, input_size=input_size
        )
        ckpt = torch.load(weights_path, map_location=dev)
        model.load_state_dict(ckpt["model_state_dict"])
        logger.info("AnomalyDetectorVAE loaded from %s", weights_path)
        return cls(model, dev, input_size)

    # -----------------------------------------------------------------
    # Preprocessing
    # -----------------------------------------------------------------

    def _preprocess(self, image: np.ndarray) -> torch.Tensor:
        """Resize and convert to [0, 1] tensor.

        Args:
            image: RGB ``uint8`` image ``(H, W, 3)``.

        Returns:
            Tensor ``(1, 3, H, W)`` in ``[0, 1]``.
        """
        img = cv2.resize(
            image, (self.input_size, self.input_size),
            interpolation=cv2.INTER_LINEAR,
        )
        img = img.astype(np.float32) / 255.0
        return torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0).to(self.device)

    # -----------------------------------------------------------------
    # Scoring
    # -----------------------------------------------------------------

    @torch.no_grad()
    def score_image(self, image: np.ndarray) -> Dict[str, Any]:
        """Compute anomaly scores for a single image.

        Args:
            image: RGB ``uint8`` image ``(H, W, 3)``.

        Returns:
            Dictionary with:
            - ``score_map``: per-pixel score array ``(H, W)`` in ``[0, 100]``
            - ``overall_score``: scalar 0-100
            - ``is_anomalous``: boolean
            - ``threshold``: active threshold
            - ``reconstruction``: VAE reconstruction ``(H, W, 3)`` uint8
        """
        tensor = self._preprocess(image)
        result = self.model.compute_anomaly_score(tensor)

        score_map = result["score_map"][0].cpu().numpy()
        overall = float(result["overall_score"][0].item())
        is_anom = bool(result["is_anomalous"][0].item())

        # Resize score map to original image dimensions
        original_h, original_w = image.shape[:2]
        score_map_resized = cv2.resize(
            score_map, (original_w, original_h),
            interpolation=cv2.INTER_LINEAR,
        )

        # Reconstruct image for visualisation
        recon = result["reconstruction"][0].cpu().numpy().transpose(1, 2, 0)
        recon = (recon * 255).clip(0, 255).astype(np.uint8)
        recon_resized = cv2.resize(
            recon, (original_w, original_h),
            interpolation=cv2.INTER_LINEAR,
        )

        return {
            "score_map": score_map_resized,
            "overall_score": overall,
            "is_anomalous": is_anom,
            "threshold": self._threshold,
            "reconstruction": recon_resized,
        }

    def score_batch(
        self, images: List[np.ndarray]
    ) -> List[Dict[str, Any]]:
        """Score multiple images.

        Args:
            images: List of RGB ``uint8`` images.

        Returns:
            List of per-image score dictionaries.
        """
        return [self.score_image(img) for img in images]

    # -----------------------------------------------------------------
    # Threshold calibration
    # -----------------------------------------------------------------

    def calibrate(
        self,
        normal_images: List[np.ndarray],
        percentile: float = 95.0,
    ) -> float:
        """Calibrate the anomaly threshold from normal images.

        Computes the overall anomaly score for each image, then sets
        the threshold at the given percentile.

        Args:
            normal_images: List of *normal* satellite images.
            percentile: Percentile to use (e.g. 95 means 5% false-positive
                rate on normal data).

        Returns:
            The calibrated threshold.
        """
        scores = []
        for img in normal_images:
            result = self.score_image(img)
            scores.append(result["overall_score"])

        scores_arr = np.array(scores)
        threshold = self.model.calibrate_threshold(scores_arr)
        self._threshold = threshold
        logger.info(
            "Calibrated threshold=%.2f from %d normal images (%.0f-th percentile)",
            threshold, len(normal_images), percentile,
        )
        return threshold

    # -----------------------------------------------------------------
    # Severity mapping
    # -----------------------------------------------------------------

    @staticmethod
    def score_to_severity(score: float) -> str:
        """Map an anomaly score to a severity label.

        Args:
            score: Overall anomaly score in ``[0, 100]``.

        Returns:
            Severity string.
        """
        if score < 10:
            return "none"
        if score < 30:
            return "low"
        if score < 60:
            return "moderate"
        if score < 80:
            return "high"
        return "critical"

    def get_anomalous_regions(
        self,
        score_map: np.ndarray,
        threshold: Optional[float] = None,
        min_area_pixels: int = 100,
    ) -> List[Dict[str, Any]]:
        """Extract contiguous anomalous regions from a score map.

        Args:
            score_map: Per-pixel anomaly scores ``(H, W)``.
            threshold: Pixel-level threshold (defaults to model threshold).
            min_area_pixels: Ignore regions smaller than this.

        Returns:
            List of region dicts with ``bbox``, ``area_pixels``, and
            ``mean_score``.
        """
        thr = threshold if threshold is not None else self._threshold
        binary = (score_map > thr).astype(np.uint8)
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        regions: List[Dict[str, Any]] = []
        for contour in contours:
            area = int(cv2.contourArea(contour))
            if area < min_area_pixels:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            region_scores = score_map[y : y + h, x : x + w]
            mean_score = float(region_scores[binary[y : y + h, x : x + w] > 0].mean())
            regions.append({
                "bbox": [int(x), int(y), int(w), int(h)],
                "area_pixels": area,
                "mean_score": round(mean_score, 2),
                "severity": self.score_to_severity(mean_score),
            })

        regions.sort(key=lambda r: r["mean_score"], reverse=True)
        return regions
