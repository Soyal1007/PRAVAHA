#!/usr/bin/env python3
"""
NER-SHIELD evaluation entry point.

Usage examples:

    # Evaluate classification model
    python evaluate.py --task classification \\
        --data-dir data/classification/test \\
        --checkpoint checkpoints/classification_best.pth

    # Evaluate segmentation model
    python evaluate.py --task segmentation \\
        --images-dir data/segmentation/test/images \\
        --masks-dir data/segmentation/test/masks \\
        --checkpoint checkpoints/segmentation_best.pth

    # Evaluate anomaly detector and calibrate threshold
    python evaluate.py --task anomaly_detection \\
        --data-dir data/normal/test \\
        --checkpoint checkpoints/anomaly_detector_best.pth \\
        --calibrate
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.architectures.classification_model import DisasterClassifier
from src.architectures.segmentation_model import SegmentationModel
from src.architectures.anomaly_detector import AnomalyDetectorVAE
from src.data.dataset_loader import (
    AnomalyDataset,
    ClassificationDataset,
    SegmentationDataset,
)
from src.data.transforms import (
    get_anomaly_val_transforms,
    get_segmentation_val_transforms,
    get_val_transforms,
)
from src.training.metrics import MetricsCalculator
from src.utils.logger import get_logger

logger = get_logger(__name__)


def evaluate_classification(
    args: argparse.Namespace, device: torch.device
) -> dict:
    """Evaluate the classification model on a test set.

    Args:
        args: Parsed CLI arguments.
        device: Torch device.

    Returns:
        Metrics dictionary.
    """
    class_names = DisasterClassifier.CLASS_NAMES
    image_size = args.image_size

    model = DisasterClassifier(
        backbone_name="efficientnet_b4",
        pretrained=False,
        num_classes=len(class_names),
    )
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()
    logger.info("Loaded classifier from %s (epoch %d)", args.checkpoint, ckpt.get("epoch", -1))

    dataset = ClassificationDataset(
        root_dir=args.data_dir,
        class_names=class_names,
        transform=get_val_transforms(image_size),
        image_size=(image_size, image_size),
    )
    loader = DataLoader(
        dataset, batch_size=args.batch_size, shuffle=False, num_workers=4
    )

    metrics_calc = MetricsCalculator(
        num_classes=len(class_names),
        class_names=class_names,
        task="classification",
    )

    with torch.no_grad():
        for batch in tqdm(loader, desc="Evaluating classification"):
            images = batch["image"].to(device)
            labels = batch["label"].numpy()
            logits = model(images)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            preds = logits.argmax(dim=1).cpu().numpy()
            metrics_calc.update(preds, labels, probs)

    results = metrics_calc.log_summary()

    # Confusion matrix
    cm = metrics_calc.compute_confusion_matrix()
    logger.info("Confusion matrix:\n%s", cm)
    results["confusion_matrix"] = cm.tolist()

    return results


def evaluate_segmentation(
    args: argparse.Namespace, device: torch.device
) -> dict:
    """Evaluate the segmentation model.

    Args:
        args: Parsed CLI arguments.
        device: Torch device.

    Returns:
        Metrics dictionary.
    """
    class_names = SegmentationModel.CLASS_NAMES
    image_size = args.image_size

    model = SegmentationModel(
        encoder_name="efficientnet-b4",
        encoder_weights=None,
        num_classes=len(class_names),
    )
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()
    logger.info("Loaded segmenter from %s", args.checkpoint)

    dataset = SegmentationDataset(
        images_dir=args.images_dir,
        masks_dir=args.masks_dir,
        class_names=class_names,
        transform=get_segmentation_val_transforms(image_size),
        image_size=(image_size, image_size),
    )
    loader = DataLoader(
        dataset, batch_size=args.batch_size, shuffle=False, num_workers=4
    )

    metrics_calc = MetricsCalculator(
        num_classes=len(class_names),
        class_names=class_names,
        task="segmentation",
    )

    with torch.no_grad():
        for batch in tqdm(loader, desc="Evaluating segmentation"):
            images = batch["image"].to(device)
            masks = batch["mask"].numpy()
            outputs = model(images)
            preds = outputs["mask_logits"].argmax(dim=1).cpu().numpy()
            metrics_calc.update(preds.flatten(), masks.flatten())

    return metrics_calc.log_summary()


def evaluate_anomaly_detection(
    args: argparse.Namespace, device: torch.device
) -> dict:
    """Evaluate the anomaly detector and optionally calibrate the threshold.

    Args:
        args: Parsed CLI arguments.
        device: Torch device.

    Returns:
        Results dictionary including per-image scores.
    """
    model = AnomalyDetectorVAE(latent_dim=256, input_size=256)
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()
    logger.info("Loaded anomaly detector from %s", args.checkpoint)

    dataset = AnomalyDataset(
        root_dir=args.data_dir,
        transform=get_anomaly_val_transforms(256),
        image_size=(256, 256),
    )
    loader = DataLoader(
        dataset, batch_size=args.batch_size, shuffle=False, num_workers=4
    )

    all_scores: list[float] = []
    all_recon_losses: list[float] = []

    with torch.no_grad():
        for batch in tqdm(loader, desc="Evaluating anomaly detector"):
            images = batch["image"].to(device)
            outputs = model(images)
            loss_dict = model.compute_loss(images, outputs)
            all_recon_losses.append(loss_dict["recon_loss"].item())

            scores = model.compute_anomaly_score(images)
            batch_scores = scores["overall_score"].cpu().numpy().tolist()
            all_scores.extend(batch_scores)

    scores_arr = np.array(all_scores)
    results = {
        "mean_score": float(scores_arr.mean()),
        "std_score": float(scores_arr.std()),
        "median_score": float(np.median(scores_arr)),
        "p95_score": float(np.percentile(scores_arr, 95)),
        "p99_score": float(np.percentile(scores_arr, 99)),
        "mean_recon_loss": float(np.mean(all_recon_losses)),
        "num_images": len(all_scores),
    }

    if args.calibrate:
        threshold = model.calibrate_threshold(scores_arr)
        results["calibrated_threshold"] = threshold

        # Save calibrated model
        calib_path = Path(args.checkpoint).parent / "anomaly_detector_calibrated.pth"
        torch.save(
            {
                "model_state_dict": model.state_dict(),
                "epoch": ckpt.get("epoch", -1),
                "metrics": results,
            },
            str(calib_path),
        )
        logger.info("Calibrated model saved to %s", calib_path)

    logger.info("Anomaly evaluation results:")
    for k, v in results.items():
        logger.info("  %-25s: %.4f", k, v)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="NER-SHIELD Model Evaluation")
    parser.add_argument(
        "--task",
        type=str,
        required=True,
        choices=["classification", "segmentation", "anomaly_detection"],
    )
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--data-dir", type=str)
    parser.add_argument("--images-dir", type=str)
    parser.add_argument("--masks-dir", type=str)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--image-size", type=int, default=512)
    parser.add_argument("--device", type=str, default="auto")
    parser.add_argument("--calibrate", action="store_true", help="Calibrate anomaly threshold")
    parser.add_argument("--output", type=str, default=None, help="Save results JSON to this path")
    args = parser.parse_args()

    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)

    evaluators = {
        "classification": evaluate_classification,
        "segmentation": evaluate_segmentation,
        "anomaly_detection": evaluate_anomaly_detection,
    }
    results = evaluators[args.task](args, device)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        # Convert any numpy arrays to lists for JSON serialisation
        serialisable = {}
        for k, v in results.items():
            if isinstance(v, np.ndarray):
                serialisable[k] = v.tolist()
            else:
                serialisable[k] = v
        with open(out_path, "w") as f:
            json.dump(serialisable, f, indent=2)
        logger.info("Results saved to %s", out_path)


if __name__ == "__main__":
    main()
