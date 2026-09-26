#!/usr/bin/env python3
"""
NER-SHIELD CLI prediction entry point.

Usage examples:

    # Single image prediction
    python predict.py --image path/to/image.png \\
        --classification-weights checkpoints/classification_best.pth \\
        --segmentation-weights checkpoints/segmentation_best.pth \\
        --anomaly-weights checkpoints/anomaly_detector_best.pth

    # Batch prediction on a directory
    python predict.py --image-dir path/to/images/ \\
        --classification-weights checkpoints/classification_best.pth \\
        --output-dir reports/

    # Before/after change detection
    python predict.py --before path/to/before.png \\
        --after path/to/after.png \\
        --change-weights checkpoints/change_detection_best.pth

    # Export model to ONNX
    python predict.py --export-onnx \\
        --classification-weights checkpoints/classification_best.pth \\
        --onnx-dir exports/onnx/
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.inference.predictor import Predictor
from src.inference.before_after_analyzer import BeforeAfterAnalyzer
from src.inference.report_generator import ReportGenerator
from src.architectures.classification_model import DisasterClassifier
from src.architectures.segmentation_model import SegmentationModel
from src.architectures.anomaly_detector import AnomalyDetectorVAE
from src.utils.logger import get_logger

logger = get_logger(__name__)


def predict_single(args: argparse.Namespace) -> None:
    """Run all models on a single image."""
    predictor = Predictor(
        config_path=args.inference_config,
        model_config_path=args.model_config,
        device=args.device,
    )

    if args.classification_weights:
        predictor.load_classifier(args.classification_weights)
    if args.segmentation_weights:
        predictor.load_segmenter(args.segmentation_weights)
    if args.anomaly_weights:
        predictor.load_anomaly_detector(args.anomaly_weights)

    result = predictor.predict_from_path(args.image)

    report_gen = ReportGenerator(output_dir=args.output_dir)
    report = report_gen.generate_json_report(result, image_path=args.image)

    # Print summary to stdout
    print("\n=== NER-SHIELD Prediction Report ===")
    print(f"Image: {args.image}")

    if "classification" in result:
        cls = result["classification"]
        print(f"\nClassification: {cls['predicted_class']} ({cls['confidence']:.1%})")
        print("  Probabilities:")
        for name, prob in cls.get("all_probabilities", {}).items():
            bar = "#" * int(prob * 40)
            print(f"    {name:25s}: {prob:.4f} {bar}")

    if "segmentation" in result:
        seg = result["segmentation"]
        print(f"\nAffected area: {seg['total_affected_area_km2']:.4f} km2")
        for name, area in seg.get("class_areas_km2", {}).items():
            if area > 0:
                print(f"    {name:20s}: {area:.4f} km2")

    if "anomaly" in result:
        anom = result["anomaly"]
        status = "ANOMALOUS" if anom["is_anomalous"] else "NORMAL"
        print(f"\nAnomaly score: {anom['anomaly_score']:.1f}/100 [{status}]")

    print(f"\nSeverity: {result.get('severity', 'unknown').upper()}")
    print(f"Explanation: {result.get('explanation', '')}")

    recs = result.get("recommendations", [])
    if recs:
        print("\nRecommendations:")
        for i, rec in enumerate(recs, 1):
            print(f"  {i}. {rec}")

    if report.get("report_path"):
        print(f"\nFull report: {report['report_path']}")


def predict_batch(args: argparse.Namespace) -> None:
    """Run prediction on all images in a directory."""
    predictor = Predictor(
        config_path=args.inference_config,
        model_config_path=args.model_config,
        device=args.device,
    )

    if args.classification_weights:
        predictor.load_classifier(args.classification_weights)
    if args.segmentation_weights:
        predictor.load_segmenter(args.segmentation_weights)
    if args.anomaly_weights:
        predictor.load_anomaly_detector(args.anomaly_weights)

    image_dir = Path(args.image_dir)
    image_paths = sorted([
        str(p) for p in image_dir.rglob("*")
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
    ])
    logger.info("Found %d images in %s", len(image_paths), args.image_dir)

    results = predictor.predict_batch(image_paths)

    report_gen = ReportGenerator(output_dir=args.output_dir)

    for result in results:
        if "error" not in result:
            report_gen.generate_json_report(result)

    summary = report_gen.generate_batch_summary(results)

    print("\n=== NER-SHIELD Batch Summary ===")
    s = summary.get("summary", {})
    print(f"Total images: {s.get('total_images', 0)}")
    print(f"Successful: {s.get('successful', 0)}")
    print(f"Errors: {s.get('errors', 0)}")
    print(f"Total affected area: {s.get('total_affected_area_km2', 0):.4f} km2")
    print(f"\nClass distribution: {json.dumps(s.get('class_distribution', {}), indent=2)}")
    print(f"Severity distribution: {json.dumps(s.get('severity_distribution', {}), indent=2)}")


def predict_change(args: argparse.Namespace) -> None:
    """Run before/after change detection."""
    analyzer = BeforeAfterAnalyzer.from_checkpoint(
        weights_path=args.change_weights,
        device=args.device,
    )

    result = analyzer.analyze_from_paths(
        before_path=args.before,
        after_path=args.after,
    )

    import cv2
    before_img = cv2.cvtColor(cv2.imread(args.before), cv2.COLOR_BGR2RGB)
    after_img = cv2.cvtColor(cv2.imread(args.after), cv2.COLOR_BGR2RGB)
    full_result = analyzer.generate_change_report(before_img, after_img)

    report_gen = ReportGenerator(output_dir=args.output_dir)
    report = report_gen.generate_change_report(full_result)

    print("\n=== NER-SHIELD Change Detection Report ===")
    print(f"Before: {args.before}")
    print(f"After:  {args.after}")
    print(f"\nChange type: {result['change_type']}")
    print(f"Magnitude: {result['magnitude_score']:.1f}/100")
    print(f"Affected area: {result['affected_area_km2']:.4f} km2")
    print(f"Changed: {result['change_percentage']:.1f}%")
    print(f"\nChange type probabilities:")
    for name, prob in result.get("change_type_probs", {}).items():
        bar = "#" * int(prob * 40)
        print(f"  {name:25s}: {prob:.4f} {bar}")

    if report.get("report_path"):
        print(f"\nFull report: {report['report_path']}")


def export_onnx(args: argparse.Namespace) -> None:
    """Export loaded models to ONNX format."""
    onnx_dir = Path(args.onnx_dir)
    onnx_dir.mkdir(parents=True, exist_ok=True)
    device = torch.device("cpu")

    if args.classification_weights:
        model = DisasterClassifier(pretrained=False)
        ckpt = torch.load(args.classification_weights, map_location=device)
        model.load_state_dict(ckpt["model_state_dict"])
        save_path = str(onnx_dir / "classification.onnx")
        model.export_onnx(save_path)
        print(f"Classification ONNX: {save_path}")

    if args.segmentation_weights:
        model = SegmentationModel(encoder_weights=None)
        ckpt = torch.load(args.segmentation_weights, map_location=device)
        model.load_state_dict(ckpt["model_state_dict"])
        save_path = str(onnx_dir / "segmentation.onnx")
        model.export_onnx(save_path)
        print(f"Segmentation ONNX: {save_path}")

    if args.anomaly_weights:
        model = AnomalyDetectorVAE(latent_dim=256, input_size=256)
        ckpt = torch.load(args.anomaly_weights, map_location=device)
        model.load_state_dict(ckpt["model_state_dict"])
        save_path = str(onnx_dir / "anomaly_detector.onnx")
        model.export_onnx(save_path)
        print(f"Anomaly detector ONNX: {save_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD Prediction CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Input modes
    parser.add_argument("--image", type=str, help="Single image path")
    parser.add_argument("--image-dir", type=str, help="Directory of images for batch")
    parser.add_argument("--before", type=str, help="Before image for change detection")
    parser.add_argument("--after", type=str, help="After image for change detection")

    # Model weights
    parser.add_argument("--classification-weights", type=str, default=None)
    parser.add_argument("--segmentation-weights", type=str, default=None)
    parser.add_argument("--anomaly-weights", type=str, default=None)
    parser.add_argument("--change-weights", type=str, default=None)

    # Config
    parser.add_argument(
        "--model-config",
        type=str,
        default=str(PROJECT_ROOT / "config" / "model_config.yaml"),
    )
    parser.add_argument(
        "--inference-config",
        type=str,
        default=str(PROJECT_ROOT / "config" / "inference_config.yaml"),
    )

    # Output
    parser.add_argument("--output-dir", type=str, default="reports")
    parser.add_argument("--device", type=str, default="auto")

    # ONNX export
    parser.add_argument("--export-onnx", action="store_true")
    parser.add_argument("--onnx-dir", type=str, default="exports/onnx")

    args = parser.parse_args()

    if args.export_onnx:
        export_onnx(args)
    elif args.before and args.after:
        if not args.change_weights:
            parser.error("--change-weights required for before/after analysis")
        predict_change(args)
    elif args.image_dir:
        predict_batch(args)
    elif args.image:
        predict_single(args)
    else:
        parser.print_help()
        parser.error("Provide --image, --image-dir, --before/--after, or --export-onnx")


if __name__ == "__main__":
    main()
