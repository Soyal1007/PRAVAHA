"""
PyTorch Dataset classes for NER-SHIELD.

Provides four dataset types aligned with the model tasks:
  - ClassificationDataset: image + label
  - SegmentationDataset: image + mask
  - ChangeDetectionDataset: before/after pair + change mask + metadata
  - AnomalyDataset: normal-only images for VAE training
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset

from src.utils.logger import get_logger

logger = get_logger(__name__)


def _load_image(path: str, size: Optional[Tuple[int, int]] = None) -> np.ndarray:
    """Read an image as RGB uint8 and optionally resize.

    Args:
        path: File path to the image.
        size: ``(H, W)`` target size.  *None* keeps the original size.

    Returns:
        RGB image as ``np.ndarray`` with shape ``(H, W, 3)``.

    Raises:
        FileNotFoundError: If the image file does not exist.
        ValueError: If the file cannot be decoded as an image.
    """
    if not Path(path).exists():
        raise FileNotFoundError(f"Image not found: {path}")
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not decode image: {path}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    if size is not None:
        img = cv2.resize(img, (size[1], size[0]), interpolation=cv2.INTER_LINEAR)
    return img


def _load_mask(path: str, size: Optional[Tuple[int, int]] = None) -> np.ndarray:
    """Read a single-channel mask and optionally resize.

    Args:
        path: File path to the mask image.
        size: ``(H, W)`` target size.

    Returns:
        Integer mask ``(H, W)``.
    """
    if not Path(path).exists():
        raise FileNotFoundError(f"Mask not found: {path}")
    mask = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise ValueError(f"Could not decode mask: {path}")
    if size is not None:
        mask = cv2.resize(mask, (size[1], size[0]), interpolation=cv2.INTER_NEAREST)
    return mask


# -----------------------------------------------------------------------
# Classification dataset
# -----------------------------------------------------------------------


class ClassificationDataset(Dataset):
    """Image classification dataset.

    Expects a root directory structured as::

        root/
          class_a/
            img_001.jpg
          class_b/
            img_002.jpg

    Or a CSV / JSON manifest file with columns ``image_path`` and ``label``.

    Args:
        root_dir: Root directory or path to a manifest file.
        class_names: Ordered list of class names.  If *None* they are
            inferred from subdirectory names.
        transform: ``albumentations`` transform pipeline.
        image_size: Resize target ``(H, W)``.
    """

    def __init__(
        self,
        root_dir: str,
        class_names: Optional[List[str]] = None,
        transform: Optional[Callable] = None,
        image_size: Tuple[int, int] = (512, 512),
    ) -> None:
        super().__init__()
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.image_size = image_size

        self.samples: List[Tuple[str, int]] = []

        manifest = self.root_dir / "manifest.json"
        if manifest.exists():
            self._load_manifest(manifest, class_names)
        else:
            self._load_from_folders(class_names)

        logger.info(
            "ClassificationDataset: %d samples, %d classes from %s",
            len(self.samples),
            len(self.class_names),
            root_dir,
        )

    def _load_from_folders(self, class_names: Optional[List[str]]) -> None:
        if class_names is not None:
            self.class_names = class_names
        else:
            dirs = sorted(
                [d.name for d in self.root_dir.iterdir() if d.is_dir()]
            )
            self.class_names = dirs
        self.class_to_idx = {c: i for i, c in enumerate(self.class_names)}

        for cls_name in self.class_names:
            cls_dir = self.root_dir / cls_name
            if not cls_dir.is_dir():
                continue
            idx = self.class_to_idx[cls_name]
            for img_path in sorted(cls_dir.glob("*")):
                if img_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}:
                    self.samples.append((str(img_path), idx))

    def _load_manifest(
        self, manifest_path: Path, class_names: Optional[List[str]]
    ) -> None:
        with open(manifest_path) as f:
            data = json.load(f)

        if class_names is not None:
            self.class_names = class_names
        else:
            self.class_names = data.get(
                "classes",
                sorted({s["label"] for s in data["samples"]}),
            )
        self.class_to_idx = {c: i for i, c in enumerate(self.class_names)}

        for entry in data["samples"]:
            img_path = str(self.root_dir / entry["image_path"])
            label_idx = self.class_to_idx[entry["label"]]
            self.samples.append((img_path, label_idx))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        img_path, label = self.samples[idx]
        image = _load_image(img_path, self.image_size)

        if self.transform is not None:
            augmented = self.transform(image=image)
            image = augmented["image"]

        if isinstance(image, np.ndarray):
            image = torch.from_numpy(image.transpose(2, 0, 1)).float() / 255.0

        return {
            "image": image,
            "label": torch.tensor(label, dtype=torch.long),
            "path": img_path,
        }

    def get_labels(self) -> List[int]:
        """Return a list of integer labels for all samples."""
        return [s[1] for s in self.samples]


# -----------------------------------------------------------------------
# Segmentation dataset
# -----------------------------------------------------------------------


class SegmentationDataset(Dataset):
    """Semantic segmentation dataset (image + mask pairs).

    Expects paired directories::

        images_dir/
          img_001.png
        masks_dir/
          img_001.png   # same name, integer-valued mask

    Args:
        images_dir: Directory containing input images.
        masks_dir: Directory containing label masks.
        class_names: Ordered list of segmentation class names.
        transform: ``albumentations`` transform (applied to image **and** mask).
        image_size: Resize target ``(H, W)``.
    """

    def __init__(
        self,
        images_dir: str,
        masks_dir: str,
        class_names: Optional[List[str]] = None,
        transform: Optional[Callable] = None,
        image_size: Tuple[int, int] = (512, 512),
    ) -> None:
        super().__init__()
        self.images_dir = Path(images_dir)
        self.masks_dir = Path(masks_dir)
        self.transform = transform
        self.image_size = image_size
        self.class_names = class_names or [
            "background",
            "landslide_scar",
            "flood_water",
            "damaged_road",
            "damaged_structure",
        ]

        self.image_paths = sorted(
            [
                p
                for p in self.images_dir.glob("*")
                if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
            ]
        )
        logger.info(
            "SegmentationDataset: %d images from %s", len(self.image_paths), images_dir
        )

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        img_path = self.image_paths[idx]
        mask_path = self.masks_dir / img_path.name

        image = _load_image(str(img_path), self.image_size)
        mask = _load_mask(str(mask_path), self.image_size)

        if self.transform is not None:
            augmented = self.transform(image=image, mask=mask)
            image = augmented["image"]
            mask = augmented["mask"]

        if isinstance(image, np.ndarray):
            image = torch.from_numpy(image.transpose(2, 0, 1)).float() / 255.0
        if isinstance(mask, np.ndarray):
            mask = torch.from_numpy(mask).long()

        return {
            "image": image,
            "mask": mask,
            "path": str(img_path),
        }


# -----------------------------------------------------------------------
# Change detection dataset
# -----------------------------------------------------------------------


class ChangeDetectionDataset(Dataset):
    """Before/after image-pair dataset for change detection.

    Expects a manifest JSON::

        {
          "pairs": [
            {
              "before": "path/to/before.png",
              "after": "path/to/after.png",
              "change_mask": "path/to/mask.png",
              "change_type": "landslide",
              "magnitude": 75
            },
            ...
          ]
        }

    Args:
        manifest_path: Path to the JSON manifest.
        transform: ``albumentations`` transform applied **independently** to
            both images (with the same random state for geometric transforms).
        image_size: Resize target ``(H, W)``.
    """

    def __init__(
        self,
        manifest_path: str,
        transform: Optional[Callable] = None,
        image_size: Tuple[int, int] = (512, 512),
        change_type_classes: Optional[List[str]] = None,
    ) -> None:
        super().__init__()
        self.manifest_path = Path(manifest_path)
        self.root_dir = self.manifest_path.parent
        self.transform = transform
        self.image_size = image_size
        self.change_type_classes = change_type_classes or [
            "landslide",
            "flood",
            "road_damage",
            "infrastructure_damage",
            "vegetation_loss",
            "normal",
        ]
        self.type_to_idx = {c: i for i, c in enumerate(self.change_type_classes)}

        with open(manifest_path) as f:
            data = json.load(f)
        self.pairs = data["pairs"]

        logger.info(
            "ChangeDetectionDataset: %d pairs from %s",
            len(self.pairs),
            manifest_path,
        )

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        entry = self.pairs[idx]
        before = _load_image(str(self.root_dir / entry["before"]), self.image_size)
        after = _load_image(str(self.root_dir / entry["after"]), self.image_size)

        change_mask_path = entry.get("change_mask")
        if change_mask_path:
            change_mask = _load_mask(
                str(self.root_dir / change_mask_path), self.image_size
            )
        else:
            change_mask = np.zeros(self.image_size, dtype=np.uint8)

        if self.transform is not None:
            # Apply same geometric transform to both images and the mask
            replay = self.transform(image=before, mask=change_mask)
            before = replay["image"]
            change_mask = replay["mask"]

            # For the 'after' image replay the same geometric transform
            # using ReplayCompose if available, else apply independently
            aug_after = self.transform(image=after, mask=change_mask)
            after = aug_after["image"]
            change_mask = aug_after["mask"]

        # Convert to tensors
        if isinstance(before, np.ndarray):
            before = torch.from_numpy(before.transpose(2, 0, 1)).float() / 255.0
        if isinstance(after, np.ndarray):
            after = torch.from_numpy(after.transpose(2, 0, 1)).float() / 255.0
        if isinstance(change_mask, np.ndarray):
            change_mask = torch.from_numpy(change_mask).float()

        change_type_str = entry.get("change_type", "normal")
        change_type = self.type_to_idx.get(change_type_str, 5)
        magnitude = float(entry.get("magnitude", 0)) / 100.0

        return {
            "before": before,
            "after": after,
            "change_mask": change_mask,
            "change_type": torch.tensor(change_type, dtype=torch.long),
            "magnitude": torch.tensor(magnitude, dtype=torch.float32),
        }


# -----------------------------------------------------------------------
# Anomaly dataset (normal images only)
# -----------------------------------------------------------------------


class AnomalyDataset(Dataset):
    """Dataset of *normal* satellite images for VAE anomaly detection.

    Args:
        root_dir: Directory containing normal images.
        transform: ``albumentations`` transform.
        image_size: Resize target ``(H, W)``.
    """

    def __init__(
        self,
        root_dir: str,
        transform: Optional[Callable] = None,
        image_size: Tuple[int, int] = (256, 256),
    ) -> None:
        super().__init__()
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.image_size = image_size

        self.image_paths = sorted(
            [
                p
                for p in self.root_dir.rglob("*")
                if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
            ]
        )
        logger.info(
            "AnomalyDataset: %d normal images from %s",
            len(self.image_paths),
            root_dir,
        )

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        img_path = self.image_paths[idx]
        image = _load_image(str(img_path), self.image_size)

        if self.transform is not None:
            augmented = self.transform(image=image)
            image = augmented["image"]

        if isinstance(image, np.ndarray):
            # Normalise to [0, 1] for VAE
            image = torch.from_numpy(image.transpose(2, 0, 1)).float() / 255.0

        return {
            "image": image,
            "path": str(img_path),
        }
