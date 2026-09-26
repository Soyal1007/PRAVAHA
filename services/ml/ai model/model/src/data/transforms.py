"""
Custom augmentation pipelines for NER-SHIELD using albumentations.

Provides separate transform pipelines for training, validation, and
test splits, as well as task-specific variants (segmentation masks
require spatial-only augmentations applied to both image and mask).
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import albumentations as A
from albumentations.pytorch import ToTensorV2

from src.utils.logger import get_logger

logger = get_logger(__name__)

# ImageNet normalisation constants
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def get_train_transforms(
    image_size: int = 512,
    mean: Tuple[float, ...] = IMAGENET_MEAN,
    std: Tuple[float, ...] = IMAGENET_STD,
    use_normalize: bool = True,
) -> A.Compose:
    """Build the training augmentation pipeline.

    Includes geometric transforms (flips, rotation, scale) and
    photometric transforms (brightness, contrast, noise, blur).

    Args:
        image_size: Target square image size.
        mean: Channel means for normalisation.
        std: Channel standard deviations.
        use_normalize: Whether to append normalisation + ToTensorV2.

    Returns:
        An ``albumentations.Compose`` pipeline.
    """
    transforms_list: List[A.BasicTransform] = [
        A.Resize(image_size, image_size),
        # Geometric
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.5),
        A.RandomRotate90(p=0.5),
        A.ShiftScaleRotate(
            shift_limit=0.1,
            scale_limit=0.15,
            rotate_limit=45,
            border_mode=0,
            p=0.5,
        ),
        # Photometric
        A.RandomBrightnessContrast(
            brightness_limit=0.2,
            contrast_limit=0.2,
            p=0.3,
        ),
        A.HueSaturationValue(
            hue_shift_limit=10,
            sat_shift_limit=20,
            val_shift_limit=15,
            p=0.3,
        ),
        A.GaussNoise(var_limit=(10.0, 50.0), p=0.2),
        A.GaussianBlur(blur_limit=(3, 5), p=0.2),
        A.CoarseDropout(
            max_holes=8,
            max_height=32,
            max_width=32,
            fill_value=0,
            p=0.2,
        ),
        A.ElasticTransform(alpha=120, sigma=6, p=0.1),
    ]

    if use_normalize:
        transforms_list.extend([
            A.Normalize(mean=mean, std=std),
            ToTensorV2(),
        ])

    return A.Compose(transforms_list)


def get_val_transforms(
    image_size: int = 512,
    mean: Tuple[float, ...] = IMAGENET_MEAN,
    std: Tuple[float, ...] = IMAGENET_STD,
    use_normalize: bool = True,
) -> A.Compose:
    """Build the validation / test transform pipeline.

    Only resize and normalisation -- no random augmentation.

    Args:
        image_size: Target square image size.
        mean: Channel means for normalisation.
        std: Channel standard deviations.
        use_normalize: Whether to append normalisation + ToTensorV2.

    Returns:
        An ``albumentations.Compose`` pipeline.
    """
    transforms_list: List[A.BasicTransform] = [
        A.Resize(image_size, image_size),
    ]

    if use_normalize:
        transforms_list.extend([
            A.Normalize(mean=mean, std=std),
            ToTensorV2(),
        ])

    return A.Compose(transforms_list)


def get_segmentation_train_transforms(
    image_size: int = 512,
    mean: Tuple[float, ...] = IMAGENET_MEAN,
    std: Tuple[float, ...] = IMAGENET_STD,
) -> A.Compose:
    """Training transforms that apply jointly to image **and** mask.

    Geometric transforms modify both; photometric transforms modify
    only the image.

    Args:
        image_size: Target square image size.
        mean: Channel means.
        std: Channel stds.

    Returns:
        ``albumentations.Compose`` compatible with ``(image=..., mask=...)``.
    """
    return A.Compose([
        A.Resize(image_size, image_size),
        # Geometric (applied to both image and mask)
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.5),
        A.RandomRotate90(p=0.5),
        A.ShiftScaleRotate(
            shift_limit=0.1,
            scale_limit=0.15,
            rotate_limit=45,
            border_mode=0,
            p=0.5,
        ),
        A.ElasticTransform(alpha=120, sigma=6, p=0.1),
        # Photometric (image only)
        A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2, p=0.3),
        A.HueSaturationValue(
            hue_shift_limit=10, sat_shift_limit=20, val_shift_limit=15, p=0.3
        ),
        A.GaussNoise(var_limit=(10.0, 50.0), p=0.2),
        A.GaussianBlur(blur_limit=(3, 5), p=0.2),
        # Normalise and convert
        A.Normalize(mean=mean, std=std),
        ToTensorV2(),
    ])


def get_segmentation_val_transforms(
    image_size: int = 512,
    mean: Tuple[float, ...] = IMAGENET_MEAN,
    std: Tuple[float, ...] = IMAGENET_STD,
) -> A.Compose:
    """Validation transforms for segmentation (resize + normalise).

    Args:
        image_size: Target square image size.
        mean: Channel means.
        std: Channel stds.

    Returns:
        ``albumentations.Compose``.
    """
    return A.Compose([
        A.Resize(image_size, image_size),
        A.Normalize(mean=mean, std=std),
        ToTensorV2(),
    ])


def get_anomaly_train_transforms(
    image_size: int = 256,
) -> A.Compose:
    """Training transforms for the anomaly VAE.

    The VAE operates on ``[0, 1]`` pixel values (no ImageNet normalisation).
    Lighter augmentation to preserve texture fidelity for reconstruction.

    Args:
        image_size: Target square image size (default 256 for efficiency).

    Returns:
        ``albumentations.Compose``.
    """
    return A.Compose([
        A.Resize(image_size, image_size),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.5),
        A.RandomRotate90(p=0.5),
        A.RandomBrightnessContrast(brightness_limit=0.1, contrast_limit=0.1, p=0.2),
        # No normalisation -- VAE expects [0, 1]
        ToTensorV2(),
    ])


def get_anomaly_val_transforms(
    image_size: int = 256,
) -> A.Compose:
    """Validation transforms for the anomaly VAE.

    Args:
        image_size: Target square image size.

    Returns:
        ``albumentations.Compose``.
    """
    return A.Compose([
        A.Resize(image_size, image_size),
        ToTensorV2(),
    ])


def get_change_detection_transforms(
    image_size: int = 512,
    mean: Tuple[float, ...] = IMAGENET_MEAN,
    std: Tuple[float, ...] = IMAGENET_STD,
    is_train: bool = True,
) -> A.Compose:
    """Transforms for change-detection image pairs.

    The same transform instance should be called twice (once for each
    image in the pair) to apply consistent geometric augmentation.
    The dataset class is responsible for seeding the random state.

    Args:
        image_size: Target square image size.
        mean: Channel means.
        std: Channel stds.
        is_train: Use training augmentations.

    Returns:
        ``albumentations.Compose``.
    """
    if is_train:
        return A.Compose([
            A.Resize(image_size, image_size),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.RandomRotate90(p=0.5),
            A.RandomBrightnessContrast(brightness_limit=0.15, contrast_limit=0.15, p=0.3),
            A.Normalize(mean=mean, std=std),
            ToTensorV2(),
        ])
    return A.Compose([
        A.Resize(image_size, image_size),
        A.Normalize(mean=mean, std=std),
        ToTensorV2(),
    ])
