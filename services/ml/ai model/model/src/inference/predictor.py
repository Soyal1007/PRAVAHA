"""
Single-image and batch inference predictor for NER-SHIELD.

Orchestrates all four model tasks (classification, segmentation,
change detection, anomaly detection) into a unified prediction
pipeline that produces a structured JSON report.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
import torch
import torch.nn.functional as F
import yaml

from src.architectures.classification_model import DisasterClassifier
from src.architectures.segmentation_model import SegmentationModel
from src.architectures.anomaly_detector import AnomalyDetectorVAE
from src.inference.anomaly_scorer import AnomalyScorer
from src.inference.heatmap_generator import HeatmapGenerator
from src.utils.geo_utils import GeoUtils
from src.utils.logger import get_logger

logger = get_logger(__name__)

# ImageNet normalisation
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _preprocess_image(
    image: np.ndarray,
    size: int = 512,
    normalize: bool = True,
) -> torch.Tensor:
    """Resize, normalise, and convert an image to a tensor.

    Args:
        image: RGB ``uint8`` image ``(H, W, 3)``.
        size: Target square size.
        normalize: Apply ImageNet normalisation.

    Returns:
        Tensor ``(1, 3, H, W)``.
    """
    img = cv2.resize(image, (size, size), interpolation=cv2.INTER_LINEAR)
    img = img.astype(np.float32) / 255.0
    if normalize:
        img = (img - MEAN) / STD
    tensor = torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0)
    return tensor


def _load_image(path: str) -> np.ndarray:
    """Read an image as RGB ``uint8``."""
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {path}")
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


class Predictor:
    """Unified inference predictor for all NER-SHIELD tasks.

    Loads classification, segmentation, and anomaly-detection models
    and runs them on a single image, producing a structured report.

    Args:
        config_path: Path to ``inference_config.yaml``.
        model_config_path: Path to ``model_config.yaml``.
        device: Device string or ``"auto"`` for GPU auto-detection.
    """

    CLASSIFICATION_CLASSES = [
        "landslide", "flood", "road_damage",
        "infrastructure_damage", "vegetation_loss", "normal",
    ]
    SEGMENTATION_CLASSES = [
        "background", "landslide_scar", "flood_water",
        "damaged_road", "damaged_structure",
    ]

    SEVERITY_THRESHOLDS = {
        "none": (0, 10),
        "low": (10, 30),
        "moderate": (30, 60),
        "high": (60, 80),
        "critical": (80, 100),
    }

    def __init__(
        self,
        config_path: Optional[str] = None,
        model_config_path: Optional[str] = None,
        device: str = "auto",
    ) -> None:
        # Resolve device
        if device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        # Load configs
        self.config: Dict[str, Any] = {}
        self.model_config: Dict[str, Any] = {}
        if config_path and Path(config_path).exists():
            with open(config_path) as f:
                self.config = yaml.safe_load(f)
        if model_config_path and Path(model_config_path).exists():
            with open(model_config_path) as f:
                self.model_config = yaml.safe_load(f)

        inf_cfg = self.config.get("inference", {})
        self.image_size = self.model_config.get("input", {}).get("image_size", 512)
        self.half = inf_cfg.get("half_precision", True) and self.device.type == "cuda"

        # Models (lazy-loaded)
        self._classifier: Optional[DisasterClassifier] = None
        self._segmenter: Optional[SegmentationModel] = None
        self._anomaly_vae: Optional[AnomalyDetectorVAE] = None
        self._heatmap_gen: Optional[HeatmapGenerator] = None
        self._anomaly_scorer: Optional[AnomalyScorer] = None

        # Geo utils
        gsd = inf_cfg.get("geo", {}).get("default_gsd_meters", 10.0)
        self.geo = GeoUtils(default_gsd=gsd)

        logger.info("Predictor initialised on %s (half=%s)", self.device, self.half)

    # -----------------------------------------------------------------
    # Model loading
    # -----------------------------------------------------------------

    def load_classifier(self, weights_path: str) -> None:
        """Load classification model from a checkpoint.

        Args:
            weights_path: Path to ``classification_best.pth``.
        """
        self._classifier = DisasterClassifier(
            backbone_name="efficientnet_b4",
            pretrained=False,
            num_classes=len(self.CLASSIFICATION_CLASSES),
        )
        ckpt = torch.load(weights_path, map_location=self.device)
        self._classifier.load_state_dict(ckpt["model_state_dict"])
        self._classifier.to(self.device).eval()
        if self.half:
            self._classifier.half()
        logger.info("Classifier loaded from %s", weights_path)

    def load_segmenter(self, weights_path: str) -> None:
        """Load segmentation model from a checkpoint.

        Args:
            weights_path: Path to ``segmentation_best.pth``.
        """
        self._segmenter = SegmentationModel(
            encoder_name="efficientnet-b4",
            encoder_weights=None,
            num_classes=len(self.SEGMENTATION_CLASSES),
        )
        ckpt = torch.load(weights_path, map_location=self.device)
        self._segmenter.load_state_dict(ckpt["model_state_dict"])
        self._segmenter.to(self.device).eval()
        if self.half:
            self._segmenter.half()
        logger.info("Segmenter loaded from %s", weights_path)

    def load_anomaly_detector(self, weights_path: str) -> None:
        """Load anomaly VAE from a checkpoint.

        Args:
            weights_path: Path to ``anomaly_detector_best.pth``.
        """
        vae_cfg = self.model_config.get("anomaly_detector", {})
        self._anomaly_vae = AnomalyDetectorVAE(
            latent_dim=vae_cfg.get("latent_dim", 256),
            input_size=vae_cfg.get("input_size", 256),
        )
        ckpt = torch.load(weights_path, map_location=self.device)
        self._anomaly_vae.load_state_dict(ckpt["model_state_dict"])
        self._anomaly_vae.to(self.device).eval()
        if self.half:
            self._anomaly_vae.half()
        self._anomaly_scorer = AnomalyScorer(self._anomaly_vae, self.device)
        logger.info("Anomaly detector loaded from %s", weights_path)

    def load_all_models(
        self,
        classification_path: str,
        segmentation_path: str,
        anomaly_path: str,
    ) -> None:
        """Load all three single-image models.

        Args:
            classification_path: Classifier checkpoint.
            segmentation_path: Segmenter checkpoint.
            anomaly_path: Anomaly VAE checkpoint.
        """
        self.load_classifier(classification_path)
        self.load_segmenter(segmentation_path)
        self.load_anomaly_detector(anomaly_path)
        self._heatmap_gen = HeatmapGenerator(self._classifier, self.device)

    # -----------------------------------------------------------------
    # Severity helpers
    # -----------------------------------------------------------------

    @staticmethod
    def _severity_from_score(score: float) -> str:
        for level, (lo, hi) in Predictor.SEVERITY_THRESHOLDS.items():
            if lo <= score < hi:
                return level
        return "critical"

    @staticmethod
    def _severity_from_confidence(
        class_name: str, confidence: float
    ) -> str:
        if class_name == "normal":
            return "none"
        if confidence >= 0.9:
            return "critical"
        if confidence >= 0.8:
            return "high"
        if confidence >= 0.65:
            return "moderate"
        if confidence >= 0.5:
            return "low"
        return "none"

    # -----------------------------------------------------------------
    # Core prediction
    # -----------------------------------------------------------------

    @torch.no_grad()
    def predict_single(
        self, image: np.ndarray
    ) -> Dict[str, Any]:
        """Run all loaded models on a single image.

        Args:
            image: RGB ``uint8`` image ``(H, W, 3)``.

        Returns:
            Structured report dictionary.
        """
        report: Dict[str, Any] = {}
        original_h, original_w = image.shape[:2]

        # 1. Classification
        if self._classifier is not None:
            tensor = _preprocess_image(image, self.image_size, normalize=True).to(self.device)
            if self.half:
                tensor = tensor.half()
            result = self._classifier.predict(tensor)
            probs = result["probabilities"][0].float().cpu().numpy()
            pred_idx = int(result["predicted_class"][0].item())
            confidence = float(result["confidence"][0].item())

            predicted_class = self.CLASSIFICATION_CLASSES[pred_idx]
            all_probs = {
                name: float(probs[i])
                for i, name in enumerate(self.CLASSIFICATION_CLASSES)
            }

            report["classification"] = {
                "predicted_class": predicted_class,
                "confidence": round(confidence, 4),
                "all_probabilities": {k: round(v, 4) for k, v in all_probs.items()},
            }
        else:
            predicted_class = "unknown"
            confidence = 0.0

        # 2. Segmentation
        if self._segmenter is not None:
            tensor = _preprocess_image(image, self.image_size, normalize=True).to(self.device)
            if self.half:
                tensor = tensor.half()
            seg_result = self._segmenter.predict(tensor)
            mask_pred = seg_result["mask_pred"][0].cpu().numpy()  # (H, W)

            # Resize mask to original image size
            mask_original = cv2.resize(
                mask_pred.astype(np.uint8),
                (original_w, original_h),
                interpolation=cv2.INTER_NEAREST,
            )

            areas = self.geo.mask_to_area_per_class(
                mask_original, self.SEGMENTATION_CLASSES
            )

            total_damage_area = sum(
                v for k, v in areas.items() if k != "background"
            )

            report["segmentation"] = {
                "damage_mask_shape": list(mask_original.shape),
                "class_areas_km2": {k: round(v, 4) for k, v in areas.items()},
                "total_affected_area_km2": round(total_damage_area, 4),
            }
            report["_mask"] = mask_original  # internal, not serialised
        else:
            total_damage_area = 0.0

        # 3. Anomaly detection
        if self._anomaly_scorer is not None:
            anomaly_result = self._anomaly_scorer.score_image(image)
            report["anomaly"] = {
                "anomaly_score": round(float(anomaly_result["overall_score"]), 2),
                "is_anomalous": bool(anomaly_result["is_anomalous"]),
                "threshold": round(float(anomaly_result["threshold"]), 2),
            }
            report["_score_map"] = anomaly_result["score_map"]
            anomaly_score = float(anomaly_result["overall_score"])
        else:
            anomaly_score = 0.0

        # 4. Heatmap (Grad-CAM)
        if self._heatmap_gen is not None and self._classifier is not None:
            heatmap = self._heatmap_gen.generate(image)
            report["_heatmap"] = heatmap

        # 5. Severity assessment
        severity_class = self._severity_from_confidence(predicted_class, confidence)
        severity_anomaly = self._severity_from_score(anomaly_score)
        overall_severity = max(
            [severity_class, severity_anomaly],
            key=lambda s: list(self.SEVERITY_THRESHOLDS.keys()).index(s),
        )

        report["severity"] = overall_severity
        report["affected_area_km2"] = round(total_damage_area, 4)

        # 6. Explanation and recommendations
        report["explanation"] = self._generate_explanation(report)
        report["recommendations"] = self._get_recommendations(predicted_class, overall_severity)

        return report

    def predict_from_path(self, image_path: str) -> Dict[str, Any]:
        """Run prediction on an image file.

        Args:
            image_path: Path to the image.

        Returns:
            Report dictionary.
        """
        image = _load_image(image_path)
        report = self.predict_single(image)
        report["input_path"] = image_path
        return report

    def predict_batch(
        self, image_paths: List[str]
    ) -> List[Dict[str, Any]]:
        """Run prediction on multiple images.

        Args:
            image_paths: List of image file paths.

        Returns:
            List of report dictionaries.
        """
        results = []
        for path in image_paths:
            try:
                result = self.predict_from_path(path)
                results.append(result)
            except Exception as e:
                logger.error("Failed to process %s: %s", path, e)
                results.append({"input_path": path, "error": str(e)})
        return results

    # -----------------------------------------------------------------
    # Explanation and recommendations
    # -----------------------------------------------------------------

    def _generate_explanation(self, report: Dict[str, Any]) -> str:
        cls_info = report.get("classification", {})
        predicted = cls_info.get("predicted_class", "unknown")
        conf = cls_info.get("confidence", 0.0)
        severity = report.get("severity", "unknown")
        area = report.get("affected_area_km2", 0.0)

        if predicted == "normal":
            return (
                f"Image classified as normal with {conf:.1%} confidence. "
                f"No significant damage detected."
            )

        parts = [
            f"Detected {predicted.replace('_', ' ')} with {conf:.1%} confidence.",
            f"Severity level: {severity}.",
        ]
        if area > 0:
            parts.append(f"Estimated affected area: {area:.3f} km2.")

        anomaly = report.get("anomaly", {})
        if anomaly.get("is_anomalous"):
            parts.append(
                f"Anomaly detection confirms unusual patterns (score: {anomaly['anomaly_score']:.1f}/100)."
            )

        return " ".join(parts)

    @staticmethod
    def _get_recommendations(
        predicted_class: str, severity: str
    ) -> List[str]:
        recs_db = {
            "landslide": [
                "Deploy geotechnical survey team to assess slope stability",
                "Establish exclusion zone around identified landslide area",
                "Coordinate with NDMA for immediate response",
                "Monitor upstream areas for secondary slide risk",
            ],
            "flood": [
                "Activate flood warning systems for downstream settlements",
                "Deploy water rescue teams to affected zones",
                "Assess road accessibility for evacuation routes",
                "Monitor water levels for recession forecast",
            ],
            "road_damage": [
                "Issue traffic advisory for affected road sections",
                "Deploy road repair and debris clearing teams",
                "Identify alternative routes for essential traffic",
                "Assess structural integrity of bridges in vicinity",
            ],
            "infrastructure_damage": [
                "Conduct structural integrity assessment",
                "Evacuate buildings showing severe damage indicators",
                "Deploy utility restoration teams",
                "Assess collateral damage to nearby infrastructure",
            ],
            "vegetation_loss": [
                "Assess erosion risk in deforested areas",
                "Monitor for secondary landslide risk due to vegetation loss",
                "Plan reforestation for slope stabilization",
                "Evaluate downstream sedimentation impact",
            ],
        }
        recs = recs_db.get(predicted_class, [])
        if severity in ("critical", "high"):
            recs = ["IMMEDIATE ACTION REQUIRED: " + recs[0]] + recs[1:] if recs else recs
        return recs
