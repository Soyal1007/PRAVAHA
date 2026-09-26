"""
Structured report generator for NER-SHIELD.

Converts raw prediction outputs into JSON reports and optional
PDF summaries.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from src.utils.logger import get_logger

logger = get_logger(__name__)


class ReportGenerator:
    """Generate structured JSON (and optional PDF) reports from
    prediction outputs.

    Args:
        output_dir: Directory for saved reports.
        include_heatmap: Embed Base64 heatmap images in JSON output.
        include_segmentation_overlay: Embed segmentation overlays.
    """

    def __init__(
        self,
        output_dir: str = "reports",
        include_heatmap: bool = True,
        include_segmentation_overlay: bool = True,
    ) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.include_heatmap = include_heatmap
        self.include_segmentation_overlay = include_segmentation_overlay

    # -----------------------------------------------------------------
    # JSON report
    # -----------------------------------------------------------------

    def generate_json_report(
        self,
        prediction: Dict[str, Any],
        image_path: Optional[str] = None,
        save: bool = True,
    ) -> Dict[str, Any]:
        """Build a structured JSON report from a prediction.

        Args:
            prediction: Output dictionary from :meth:`Predictor.predict_single`.
            image_path: Original image file path (for metadata).
            save: Persist the JSON to disk.

        Returns:
            The report dictionary.
        """
        report: Dict[str, Any] = {
            "metadata": {
                "system": "NER-SHIELD",
                "version": "1.0.0",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "image_path": image_path or prediction.get("input_path", "unknown"),
            },
        }

        # Classification
        cls_info = prediction.get("classification", {})
        report["classification"] = {
            "predicted_class": cls_info.get("predicted_class", "unknown"),
            "confidence": cls_info.get("confidence", 0.0),
            "all_probabilities": cls_info.get("all_probabilities", {}),
        }

        # Segmentation
        seg_info = prediction.get("segmentation", {})
        report["segmentation"] = {
            "class_areas_km2": seg_info.get("class_areas_km2", {}),
            "total_affected_area_km2": seg_info.get("total_affected_area_km2", 0.0),
        }

        # Anomaly
        anom_info = prediction.get("anomaly", {})
        report["anomaly"] = {
            "anomaly_score": anom_info.get("anomaly_score", 0.0),
            "is_anomalous": anom_info.get("is_anomalous", False),
            "threshold": anom_info.get("threshold", 0.0),
        }

        # Severity and summary
        report["severity"] = prediction.get("severity", "unknown")
        report["affected_area_km2"] = prediction.get("affected_area_km2", 0.0)
        report["explanation"] = prediction.get("explanation", "")
        report["recommendations"] = prediction.get("recommendations", [])

        # Save heatmap and mask images alongside the JSON
        report_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_dir = self.output_dir / report_id
        report_dir.mkdir(parents=True, exist_ok=True)

        if self.include_heatmap and "_heatmap" in prediction:
            heatmap_path = report_dir / "heatmap.png"
            heatmap = prediction["_heatmap"]
            heatmap_uint8 = (heatmap * 255).clip(0, 255).astype(np.uint8)
            cv2.imwrite(str(heatmap_path), heatmap_uint8)
            report["heatmap_path"] = str(heatmap_path)

        if self.include_segmentation_overlay and "_mask" in prediction:
            mask_path = report_dir / "segmentation_mask.png"
            mask = prediction["_mask"]
            cv2.imwrite(str(mask_path), mask.astype(np.uint8))
            report["segmentation_mask_path"] = str(mask_path)

        if "_score_map" in prediction:
            score_path = report_dir / "anomaly_score_map.png"
            score_map = prediction["_score_map"]
            score_uint8 = (score_map * 255 / 100).clip(0, 255).astype(np.uint8)
            cv2.imwrite(str(score_path), score_uint8)
            report["anomaly_score_map_path"] = str(score_path)

        if save:
            json_path = report_dir / "report.json"
            # Remove internal numpy arrays before serialisation
            serialisable = {
                k: v for k, v in report.items() if not k.startswith("_")
            }
            with open(json_path, "w") as f:
                json.dump(serialisable, f, indent=2, default=str)
            logger.info("Report saved to %s", json_path)
            report["report_path"] = str(json_path)

        return report

    # -----------------------------------------------------------------
    # Change-detection report
    # -----------------------------------------------------------------

    def generate_change_report(
        self,
        change_result: Dict[str, Any],
        save: bool = True,
    ) -> Dict[str, Any]:
        """Build a structured report from a change-detection result.

        Args:
            change_result: Output of
                :meth:`BeforeAfterAnalyzer.analyze`.
            save: Persist the JSON to disk.

        Returns:
            Report dictionary.
        """
        report: Dict[str, Any] = {
            "metadata": {
                "system": "NER-SHIELD",
                "version": "1.0.0",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "before_path": change_result.get("before_path", ""),
                "after_path": change_result.get("after_path", ""),
            },
            "change_detection": {
                "change_type": change_result.get("change_type", "unknown"),
                "change_type_probabilities": change_result.get("change_type_probs", {}),
                "magnitude_score": change_result.get("magnitude_score", 0.0),
                "affected_area_km2": change_result.get("affected_area_km2", 0.0),
                "change_percentage": change_result.get("change_percentage", 0.0),
            },
        }

        if save:
            report_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            report_dir = self.output_dir / f"change_{report_id}"
            report_dir.mkdir(parents=True, exist_ok=True)

            # Save change mask
            if "change_mask" in change_result:
                mask_path = report_dir / "change_mask.png"
                cv2.imwrite(
                    str(mask_path),
                    (change_result["change_mask"] * 255).astype(np.uint8),
                )
                report["change_mask_path"] = str(mask_path)

            # Save visualisation
            if "visualization" in change_result:
                viz_path = report_dir / "comparison.png"
                viz = change_result["visualization"]
                cv2.imwrite(
                    str(viz_path),
                    cv2.cvtColor(viz, cv2.COLOR_RGB2BGR),
                )
                report["visualization_path"] = str(viz_path)

            json_path = report_dir / "change_report.json"
            serialisable = {
                k: v for k, v in report.items()
                if not isinstance(v, np.ndarray)
            }
            with open(json_path, "w") as f:
                json.dump(serialisable, f, indent=2, default=str)
            logger.info("Change report saved to %s", json_path)
            report["report_path"] = str(json_path)

        return report

    # -----------------------------------------------------------------
    # Batch reports
    # -----------------------------------------------------------------

    def generate_batch_summary(
        self,
        predictions: List[Dict[str, Any]],
        save: bool = True,
    ) -> Dict[str, Any]:
        """Aggregate predictions into a batch summary report.

        Args:
            predictions: List of single-image prediction dicts.
            save: Persist the summary JSON.

        Returns:
            Summary report dictionary.
        """
        total = len(predictions)
        errors = [p for p in predictions if "error" in p]
        successful = [p for p in predictions if "error" not in p]

        class_counts: Dict[str, int] = {}
        severities: Dict[str, int] = {}
        total_area = 0.0

        for pred in successful:
            cls_info = pred.get("classification", {})
            cls_name = cls_info.get("predicted_class", "unknown")
            class_counts[cls_name] = class_counts.get(cls_name, 0) + 1

            sev = pred.get("severity", "unknown")
            severities[sev] = severities.get(sev, 0) + 1

            total_area += pred.get("affected_area_km2", 0.0)

        summary = {
            "metadata": {
                "system": "NER-SHIELD",
                "version": "1.0.0",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "summary": {
                "total_images": total,
                "successful": len(successful),
                "errors": len(errors),
                "class_distribution": class_counts,
                "severity_distribution": severities,
                "total_affected_area_km2": round(total_area, 4),
            },
        }

        if save:
            summary_path = self.output_dir / "batch_summary.json"
            with open(summary_path, "w") as f:
                json.dump(summary, f, indent=2, default=str)
            logger.info("Batch summary saved to %s", summary_path)

        return summary
