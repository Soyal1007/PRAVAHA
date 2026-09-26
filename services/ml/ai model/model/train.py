#!/usr/bin/env python3
"""
NER-SHIELD training entry point.

Usage examples:

    # Train the classification model
    python train.py --task classification --data-dir data/classification

    # Train the segmentation model
    python train.py --task segmentation \\
        --images-dir data/segmentation/images \\
        --masks-dir data/segmentation/masks

    # Train the change-detection model
    python train.py --task change_detection --manifest data/change/manifest.json

    # Train the anomaly detector on normal images
    python train.py --task anomaly_detection --data-dir data/normal

    # Resume training from a checkpoint
    python train.py --task classification --data-dir data/classification \\
        --resume checkpoints/classification_last.pth
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

import numpy as np
import torch
import yaml
from torch.utils.data import DataLoader, random_split

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.architectures.classification_model import DisasterClassifier
from src.architectures.segmentation_model import SegmentationModel
from src.architectures.change_detection_net import ChangeDetectionNet
from src.architectures.anomaly_detector import AnomalyDetectorVAE
from src.data.dataset_loader import (
    AnomalyDataset,
    ChangeDetectionDataset,
    ClassificationDataset,
    SegmentationDataset,
)
from src.data.sampler import create_weighted_sampler
from src.data.transforms import (
    get_anomaly_train_transforms,
    get_anomaly_val_transforms,
    get_segmentation_train_transforms,
    get_segmentation_val_transforms,
    get_train_transforms,
    get_val_transforms,
)
from src.training.losses import (
    ChangeDetectionLoss,
    CombinedSegmentationLoss,
    FocalLoss,
)
from src.training.trainer import Trainer
from src.utils.logger import get_logger

logger = get_logger(__name__)


def set_seed(seed: int) -> None:
    """Set random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def load_configs(
    model_config_path: str, training_config_path: str
) -> tuple[dict, dict]:
    """Load YAML configuration files."""
    with open(model_config_path) as f:
        model_cfg = yaml.safe_load(f)
    with open(training_config_path) as f:
        train_cfg = yaml.safe_load(f)
    return model_cfg, train_cfg


def build_classification(
    args: argparse.Namespace,
    model_cfg: dict,
    train_cfg: dict,
    device: torch.device,
) -> tuple:
    """Build classification model, data loaders, loss, and trainer."""
    cls_cfg = model_cfg.get("classification", {})
    class_names = cls_cfg.get("classes", DisasterClassifier.CLASS_NAMES)
    class_weights_map = cls_cfg.get("class_weights", DisasterClassifier.CLASS_WEIGHTS)
    image_size = model_cfg.get("input", {}).get("image_size", 512)

    # Model
    model = DisasterClassifier(
        backbone_name=model_cfg.get("backbone", {}).get("name", "efficientnet_b4"),
        pretrained=True,
        num_classes=len(class_names),
        hidden_dim=cls_cfg.get("head", {}).get("hidden_dim", 512),
        dropout_1=cls_cfg.get("head", {}).get("dropout_1", 0.3),
        dropout_2=cls_cfg.get("head", {}).get("dropout_2", 0.2),
    )

    # Datasets
    train_transform = get_train_transforms(image_size)
    val_transform = get_val_transforms(image_size)

    full_dataset = ClassificationDataset(
        root_dir=args.data_dir,
        class_names=class_names,
        transform=None,  # set per split below
        image_size=(image_size, image_size),
    )

    # Split
    data_cfg = train_cfg.get("data", {})
    train_ratio = data_cfg.get("train_ratio", 0.7)
    val_ratio = data_cfg.get("val_ratio", 0.15)

    n_total = len(full_dataset)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)
    n_test = n_total - n_train - n_val

    train_ds, val_ds, _ = random_split(full_dataset, [n_train, n_val, n_test])

    # Wrap splits with their own transforms
    train_ds.dataset = ClassificationDataset(
        root_dir=args.data_dir,
        class_names=class_names,
        transform=train_transform,
        image_size=(image_size, image_size),
    )
    val_ds.dataset = ClassificationDataset(
        root_dir=args.data_dir,
        class_names=class_names,
        transform=val_transform,
        image_size=(image_size, image_size),
    )

    # Sampler for balanced training
    labels = [full_dataset.samples[i][1] for i in train_ds.indices]
    sampler = create_weighted_sampler(
        labels=labels,
        class_weight_map=class_weights_map,
        class_names=class_names,
    )

    t_cfg = train_cfg.get("training", {})
    batch_size = t_cfg.get("batch_size", 16)
    num_workers = t_cfg.get("num_workers", 4)

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    # Loss
    weight_tensor = model.get_class_weights_tensor(device)
    loss_fn = FocalLoss(
        gamma=cls_cfg.get("loss", {}).get("gamma", 2.0),
        alpha=weight_tensor,
    )

    # Optimizer
    opt_cfg = t_cfg.get("optimizer", {})
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=opt_cfg.get("lr", 1e-4),
        weight_decay=opt_cfg.get("weight_decay", 1e-4),
        betas=tuple(opt_cfg.get("betas", [0.9, 0.999])),
    )

    trainer = Trainer(
        model=model,
        optimizer=optimizer,
        loss_fn=loss_fn,
        device=device,
        task="classification",
        num_classes=len(class_names),
        class_names=class_names,
        config=train_cfg,
    )

    return trainer, train_loader, val_loader


def build_segmentation(
    args: argparse.Namespace,
    model_cfg: dict,
    train_cfg: dict,
    device: torch.device,
) -> tuple:
    """Build segmentation model, data loaders, loss, and trainer."""
    seg_cfg = model_cfg.get("segmentation", {})
    class_names = seg_cfg.get("classes", SegmentationModel.CLASS_NAMES)
    image_size = model_cfg.get("input", {}).get("image_size", 512)

    model = SegmentationModel(
        encoder_name=seg_cfg.get("encoder_name", "efficientnet-b4"),
        encoder_weights="imagenet",
        num_classes=len(class_names),
        decoder_channels=tuple(seg_cfg.get("decoder_channels", [256, 128, 64, 32, 16])),
        decoder_attention_type=seg_cfg.get("decoder_attention_type", "scse"),
    )

    train_transform = get_segmentation_train_transforms(image_size)
    val_transform = get_segmentation_val_transforms(image_size)

    train_ds = SegmentationDataset(
        images_dir=args.images_dir,
        masks_dir=args.masks_dir,
        class_names=class_names,
        transform=train_transform,
        image_size=(image_size, image_size),
    )
    val_ds = SegmentationDataset(
        images_dir=args.val_images_dir or args.images_dir,
        masks_dir=args.val_masks_dir or args.masks_dir,
        class_names=class_names,
        transform=val_transform,
        image_size=(image_size, image_size),
    )

    t_cfg = train_cfg.get("training", {})
    batch_size = t_cfg.get("batch_size", 16)
    num_workers = t_cfg.get("num_workers", 4)

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    loss_fn = CombinedSegmentationLoss(
        dice_weight=seg_cfg.get("loss", {}).get("dice_weight", 0.5),
        focal_weight=seg_cfg.get("loss", {}).get("focal_weight", 0.5),
        focal_gamma=seg_cfg.get("loss", {}).get("focal_gamma", 2.0),
    )

    opt_cfg = t_cfg.get("optimizer", {})
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=opt_cfg.get("lr", 1e-4),
        weight_decay=opt_cfg.get("weight_decay", 1e-4),
    )

    trainer = Trainer(
        model=model,
        optimizer=optimizer,
        loss_fn=loss_fn,
        device=device,
        task="segmentation",
        num_classes=len(class_names),
        class_names=class_names,
        config=train_cfg,
    )

    return trainer, train_loader, val_loader


def build_change_detection(
    args: argparse.Namespace,
    model_cfg: dict,
    train_cfg: dict,
    device: torch.device,
) -> tuple:
    """Build change-detection model, loaders, loss, and trainer."""
    cd_cfg = model_cfg.get("change_detection", {})
    image_size = model_cfg.get("input", {}).get("image_size", 512)

    model = ChangeDetectionNet(
        encoder_name=cd_cfg.get("encoder_name", "efficientnet_b4"),
        pretrained=True,
        fpn_out_channels=cd_cfg.get("fpn", {}).get("out_channels", 256),
        num_change_types=cd_cfg.get("outputs", {}).get("change_type_classes", 6),
    )

    train_ds = ChangeDetectionDataset(
        manifest_path=args.manifest,
        image_size=(image_size, image_size),
    )

    n_total = len(train_ds)
    n_train = int(n_total * 0.8)
    n_val = n_total - n_train
    train_split, val_split = random_split(train_ds, [n_train, n_val])

    t_cfg = train_cfg.get("training", {})
    batch_size = t_cfg.get("batch_size", 16)
    num_workers = t_cfg.get("num_workers", 4)

    train_loader = DataLoader(
        train_split,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_split,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    loss_fn = ChangeDetectionLoss()

    opt_cfg = t_cfg.get("optimizer", {})
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=opt_cfg.get("lr", 1e-4),
        weight_decay=opt_cfg.get("weight_decay", 1e-4),
    )

    trainer = Trainer(
        model=model,
        optimizer=optimizer,
        loss_fn=loss_fn,
        device=device,
        task="change_detection",
        num_classes=6,
        config=train_cfg,
    )

    return trainer, train_loader, val_loader


def build_anomaly_detection(
    args: argparse.Namespace,
    model_cfg: dict,
    train_cfg: dict,
    device: torch.device,
) -> tuple:
    """Build anomaly VAE, loaders, and trainer."""
    vae_cfg = model_cfg.get("anomaly_detector", {})
    input_size = vae_cfg.get("input_size", 256)

    model = AnomalyDetectorVAE(
        latent_dim=vae_cfg.get("latent_dim", 256),
        encoder_channels=tuple(vae_cfg.get("encoder_channels", [32, 64, 128, 256, 512])),
        decoder_channels=tuple(vae_cfg.get("decoder_channels", [512, 256, 128, 64, 32])),
        input_size=input_size,
        kl_weight=vae_cfg.get("kl_weight", 0.0005),
    )

    train_transform = get_anomaly_train_transforms(input_size)
    val_transform = get_anomaly_val_transforms(input_size)

    full_dataset = AnomalyDataset(
        root_dir=args.data_dir,
        transform=None,
        image_size=(input_size, input_size),
    )

    n_total = len(full_dataset)
    n_train = int(n_total * 0.85)
    n_val = n_total - n_train
    train_split, val_split = random_split(full_dataset, [n_train, n_val])

    # Apply transforms
    train_ds = AnomalyDataset(
        root_dir=args.data_dir,
        transform=train_transform,
        image_size=(input_size, input_size),
    )
    val_ds = AnomalyDataset(
        root_dir=args.data_dir,
        transform=val_transform,
        image_size=(input_size, input_size),
    )

    task_cfg = train_cfg.get("task_configs", {}).get("anomaly_detection", {})
    batch_size = task_cfg.get("batch_size", 32)
    t_cfg = train_cfg.get("training", {})
    num_workers = t_cfg.get("num_workers", 4)

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    # The loss is computed inside the model, but we need a dummy for the
    # trainer interface
    def anomaly_loss_fn(x: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        return torch.tensor(0.0)  # not used — trainer calls model.compute_loss

    # Override training epochs for anomaly detector
    modified_train_cfg = dict(train_cfg)
    modified_train_cfg.setdefault("training", {})["epochs"] = task_cfg.get("epochs", 150)

    opt_cfg = t_cfg.get("optimizer", {})
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=opt_cfg.get("lr", 1e-4),
        weight_decay=opt_cfg.get("weight_decay", 1e-4),
    )

    trainer = Trainer(
        model=model,
        optimizer=optimizer,
        loss_fn=anomaly_loss_fn,
        device=device,
        task="anomaly_detection",
        num_classes=1,
        config=modified_train_cfg,
    )

    return trainer, train_loader, val_loader


def main() -> None:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD Model Training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--task",
        type=str,
        required=True,
        choices=["classification", "segmentation", "change_detection", "anomaly_detection"],
        help="Training task",
    )
    parser.add_argument("--data-dir", type=str, help="Root data directory")
    parser.add_argument("--images-dir", type=str, help="Segmentation images directory")
    parser.add_argument("--masks-dir", type=str, help="Segmentation masks directory")
    parser.add_argument("--val-images-dir", type=str, default=None)
    parser.add_argument("--val-masks-dir", type=str, default=None)
    parser.add_argument("--manifest", type=str, help="Change detection manifest JSON")
    parser.add_argument(
        "--model-config",
        type=str,
        default=str(PROJECT_ROOT / "config" / "model_config.yaml"),
    )
    parser.add_argument(
        "--training-config",
        type=str,
        default=str(PROJECT_ROOT / "config" / "training_config.yaml"),
    )
    parser.add_argument("--resume", type=str, default=None, help="Checkpoint to resume from")
    parser.add_argument("--device", type=str, default="auto")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    # Seed
    set_seed(args.seed)

    # Device
    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)
    logger.info("Using device: %s", device)

    # Load configs
    model_cfg, train_cfg = load_configs(args.model_config, args.training_config)

    # Build task
    builders = {
        "classification": build_classification,
        "segmentation": build_segmentation,
        "change_detection": build_change_detection,
        "anomaly_detection": build_anomaly_detection,
    }
    trainer, train_loader, val_loader = builders[args.task](
        args, model_cfg, train_cfg, device
    )

    # Resume
    if args.resume:
        trainer.load_checkpoint(args.resume)

    # Train
    results = trainer.fit(train_loader, val_loader)

    logger.info("Training complete. Best metric: %s", results.get("best_metric"))
    logger.info("Epochs trained: %d", results.get("epochs_trained"))


if __name__ == "__main__":
    main()
