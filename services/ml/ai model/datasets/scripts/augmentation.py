#!/usr/bin/env python3
"""
NER-SHIELD: Data Augmentation Pipeline
Applies comprehensive augmentations to training images:
  - HorizontalFlip, VerticalFlip, RandomRotate90
  - RandomBrightnessContrast (+/-15%)
  - GaussNoise
  - RandomCrop + Resize
  - ColorJitter
  - ElasticTransform
  - Custom Mixup and CutMix

Uses albumentations where available, with numpy/OpenCV fallback.

Usage:
    python augmentation.py --input-dir ./processed/train --output-dir ./processed/train_augmented
    python augmentation.py --input-dir ./processed/train --output-dir ./processed/train_augmented --factor 3
"""

import argparse
import json
import logging
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import albumentations as A
    HAS_ALBUMENTATIONS = True
except ImportError:
    HAS_ALBUMENTATIONS = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CLASS_LABELS = {
    0: "normal",
    1: "landslide",
    2: "flood",
    3: "road_damage",
    4: "infrastructure_damage",
    5: "terrain_change",
}

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"augmentation_{timestamp}.log"

    logger = logging.getLogger("augmentation")
    logger.setLevel(logging.DEBUG)

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    fh.setFormatter(fmt)
    ch.setFormatter(fmt)
    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


# ---------------------------------------------------------------------------
# Image I/O
# ---------------------------------------------------------------------------

def load_image(filepath: Path) -> Optional[np.ndarray]:
    """Load image as numpy array (H, W, C) in uint8."""
    if HAS_CV2:
        img = cv2.imread(str(filepath), cv2.IMREAD_UNCHANGED)
        if img is not None:
            if img.ndim == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            elif img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
            # Normalize to uint8 if needed
            if img.dtype == np.uint16:
                img = (img / 256).astype(np.uint8)
            elif img.dtype == np.float32 or img.dtype == np.float64:
                img = (np.clip(img, 0, 1) * 255).astype(np.uint8)
            return img
    if HAS_PIL:
        try:
            pil_img = Image.open(filepath).convert("RGB")
            return np.array(pil_img)
        except Exception:
            pass
    return None


def save_image(img: np.ndarray, filepath: Path):
    """Save numpy array as image."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    if HAS_CV2:
        cv2.imwrite(str(filepath), img)
    elif HAS_PIL:
        if img.ndim == 3 and img.shape[2] == 3:
            pil_img = Image.fromarray(img[..., ::-1])  # BGR to RGB
        else:
            pil_img = Image.fromarray(img)
        pil_img.save(filepath)


def load_label(image_path: Path) -> Optional[Dict]:
    """Load label JSON sidecar file."""
    label_path = image_path.parent / f"{image_path.stem}_label.json"
    if label_path.exists():
        with open(label_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_label(label_data: Dict, image_path: Path):
    """Save label JSON sidecar file."""
    label_path = image_path.parent / f"{image_path.stem}_label.json"
    with open(label_path, "w", encoding="utf-8") as f:
        json.dump(label_data, f, indent=2)


# ---------------------------------------------------------------------------
# Albumentations-based augmentations
# ---------------------------------------------------------------------------

def build_augmentation_pipeline(tile_size: int = 256) -> Any:
    """Build the albumentations augmentation pipeline."""
    if not HAS_ALBUMENTATIONS:
        return None

    transforms = A.Compose([
        A.OneOf([
            A.HorizontalFlip(p=1.0),
            A.VerticalFlip(p=1.0),
            A.RandomRotate90(p=1.0),
        ], p=0.75),
        A.RandomBrightnessContrast(
            brightness_limit=0.15,
            contrast_limit=0.15,
            p=0.5,
        ),
        A.GaussNoise(
            var_limit=(10.0, 50.0),
            p=0.3,
        ),
        A.OneOf([
            A.RandomResizedCrop(
                size=(tile_size, tile_size),
                scale=(0.7, 1.0),
                ratio=(0.9, 1.1),
                p=1.0,
            ),
            A.CenterCrop(
                height=int(tile_size * 0.8),
                width=int(tile_size * 0.8),
                p=1.0,
            ),
        ], p=0.3),
        A.Resize(height=tile_size, width=tile_size, p=1.0),
        A.ColorJitter(
            brightness=0.1,
            contrast=0.1,
            saturation=0.1,
            hue=0.05,
            p=0.4,
        ),
        A.ElasticTransform(
            alpha=50,
            sigma=5,
            p=0.2,
        ),
    ])

    return transforms


def build_individual_transforms(tile_size: int = 256) -> Dict[str, Any]:
    """Build individual named transforms for controlled augmentation."""
    if not HAS_ALBUMENTATIONS:
        return {}

    return {
        "hflip": A.Compose([
            A.HorizontalFlip(p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
        "vflip": A.Compose([
            A.VerticalFlip(p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
        "rotate90": A.Compose([
            A.RandomRotate90(p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
        "brightness_contrast": A.Compose([
            A.RandomBrightnessContrast(brightness_limit=0.15, contrast_limit=0.15, p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
        "gauss_noise": A.Compose([
            A.GaussNoise(var_limit=(10.0, 50.0), p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
        "crop_resize": A.Compose([
            A.RandomResizedCrop(
                size=(tile_size, tile_size),
                scale=(0.6, 1.0),
                ratio=(0.9, 1.1),
                p=1.0,
            ),
        ]),
        "color_jitter": A.Compose([
            A.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15, hue=0.05, p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
        "elastic": A.Compose([
            A.ElasticTransform(alpha=50, sigma=5, p=1.0),
            A.Resize(height=tile_size, width=tile_size),
        ]),
    }


# ---------------------------------------------------------------------------
# Numpy/OpenCV fallback augmentations
# ---------------------------------------------------------------------------

class FallbackAugmentor:
    """Augmentations using numpy/OpenCV when albumentations is not available."""

    @staticmethod
    def horizontal_flip(img: np.ndarray) -> np.ndarray:
        return img[:, ::-1].copy()

    @staticmethod
    def vertical_flip(img: np.ndarray) -> np.ndarray:
        return img[::-1, :].copy()

    @staticmethod
    def rotate90(img: np.ndarray) -> np.ndarray:
        k = random.choice([1, 2, 3])
        return np.rot90(img, k).copy()

    @staticmethod
    def brightness_contrast(
        img: np.ndarray,
        brightness_range: float = 0.15,
        contrast_range: float = 0.15,
    ) -> np.ndarray:
        alpha = 1.0 + random.uniform(-contrast_range, contrast_range)
        beta = random.uniform(-brightness_range, brightness_range) * 255
        result = np.clip(alpha * img.astype(np.float32) + beta, 0, 255).astype(np.uint8)
        return result

    @staticmethod
    def gauss_noise(img: np.ndarray, var: float = 25.0) -> np.ndarray:
        noise = np.random.normal(0, var, img.shape).astype(np.float32)
        result = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
        return result

    @staticmethod
    def random_crop_resize(img: np.ndarray, tile_size: int = 256) -> np.ndarray:
        h, w = img.shape[:2]
        scale = random.uniform(0.6, 1.0)
        crop_h = int(h * scale)
        crop_w = int(w * scale)
        top = random.randint(0, h - crop_h)
        left = random.randint(0, w - crop_w)
        cropped = img[top:top + crop_h, left:left + crop_w]
        if HAS_CV2:
            return cv2.resize(cropped, (tile_size, tile_size), interpolation=cv2.INTER_LINEAR)
        else:
            pil_img = Image.fromarray(cropped)
            return np.array(pil_img.resize((tile_size, tile_size), Image.BILINEAR))

    @staticmethod
    def color_jitter(img: np.ndarray) -> np.ndarray:
        # Simple color jitter via channel-wise adjustments
        result = img.astype(np.float32)
        for c in range(result.shape[2] if result.ndim == 3 else 1):
            factor = random.uniform(0.85, 1.15)
            if result.ndim == 3:
                result[:, :, c] *= factor
            else:
                result *= factor
        return np.clip(result, 0, 255).astype(np.uint8)

    @staticmethod
    def elastic_transform(
        img: np.ndarray,
        alpha: float = 50,
        sigma: float = 5,
    ) -> np.ndarray:
        if not HAS_CV2:
            return img
        h, w = img.shape[:2]
        dx = cv2.GaussianBlur(
            (np.random.rand(h, w).astype(np.float32) * 2 - 1), (0, 0), sigma,
        ) * alpha
        dy = cv2.GaussianBlur(
            (np.random.rand(h, w).astype(np.float32) * 2 - 1), (0, 0), sigma,
        ) * alpha
        x, y = np.meshgrid(np.arange(w), np.arange(h))
        map_x = (x + dx).astype(np.float32)
        map_y = (y + dy).astype(np.float32)
        return cv2.remap(img, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    @classmethod
    def get_transforms(cls, tile_size: int = 256) -> Dict[str, Any]:
        return {
            "hflip": cls.horizontal_flip,
            "vflip": cls.vertical_flip,
            "rotate90": cls.rotate90,
            "brightness_contrast": cls.brightness_contrast,
            "gauss_noise": cls.gauss_noise,
            "crop_resize": lambda img: cls.random_crop_resize(img, tile_size),
            "color_jitter": cls.color_jitter,
            "elastic": cls.elastic_transform,
        }


# ---------------------------------------------------------------------------
# Mixup / CutMix (custom implementations)
# ---------------------------------------------------------------------------

def mixup(
    img1: np.ndarray,
    img2: np.ndarray,
    alpha: float = 0.2,
) -> Tuple[np.ndarray, float]:
    """
    Mixup augmentation: blend two images with a Beta-distributed lambda.
    Returns (blended_image, lambda_value).
    """
    lam = np.random.beta(alpha, alpha) if alpha > 0 else 0.5
    lam = max(lam, 1 - lam)  # Ensure primary image dominates

    # Resize img2 to match img1 if needed
    if img1.shape != img2.shape:
        if HAS_CV2:
            img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
        else:
            img2 = np.array(
                Image.fromarray(img2).resize((img1.shape[1], img1.shape[0]))
            )

    mixed = (lam * img1.astype(np.float32) + (1 - lam) * img2.astype(np.float32))
    return np.clip(mixed, 0, 255).astype(np.uint8), lam


def cutmix(
    img1: np.ndarray,
    img2: np.ndarray,
    alpha: float = 1.0,
) -> Tuple[np.ndarray, float, Tuple[int, int, int, int]]:
    """
    CutMix augmentation: replace a random rectangular region of img1 with img2.
    Returns (mixed_image, lambda_value, (x1, y1, x2, y2)).
    """
    h, w = img1.shape[:2]

    # Resize img2 to match img1 if needed
    if img1.shape != img2.shape:
        if HAS_CV2:
            img2 = cv2.resize(img2, (w, h))
        else:
            img2 = np.array(Image.fromarray(img2).resize((w, h)))

    lam = np.random.beta(alpha, alpha) if alpha > 0 else 0.5

    cut_ratio = np.sqrt(1.0 - lam)
    cut_w = int(w * cut_ratio)
    cut_h = int(h * cut_ratio)

    cx = random.randint(0, w)
    cy = random.randint(0, h)

    x1 = max(0, cx - cut_w // 2)
    y1 = max(0, cy - cut_h // 2)
    x2 = min(w, cx + cut_w // 2)
    y2 = min(h, cy + cut_h // 2)

    result = img1.copy()
    result[y1:y2, x1:x2] = img2[y1:y2, x1:x2]

    # Actual lambda (proportion of img1 remaining)
    actual_lam = 1.0 - ((x2 - x1) * (y2 - y1)) / (w * h)

    return result, actual_lam, (x1, y1, x2, y2)


# ---------------------------------------------------------------------------
# Augmentation Engine
# ---------------------------------------------------------------------------

class AugmentationEngine:
    """Full augmentation engine combining albumentations and custom transforms."""

    def __init__(
        self,
        tile_size: int = 256,
        augmentation_factor: int = 3,
        enable_mixup: bool = True,
        enable_cutmix: bool = True,
        mixup_alpha: float = 0.2,
        cutmix_alpha: float = 1.0,
        seed: Optional[int] = None,
    ):
        self.tile_size = tile_size
        self.augmentation_factor = augmentation_factor
        self.enable_mixup = enable_mixup
        self.enable_cutmix = enable_cutmix
        self.mixup_alpha = mixup_alpha
        self.cutmix_alpha = cutmix_alpha

        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        # Build transform pipelines
        if HAS_ALBUMENTATIONS:
            self.combined_transform = build_augmentation_pipeline(tile_size)
            self.individual_transforms = build_individual_transforms(tile_size)
        else:
            self.combined_transform = None
            self.individual_transforms = FallbackAugmentor.get_transforms(tile_size)

        self.stats = {
            "total_augmented": 0,
            "by_method": {},
        }

    def augment_single(
        self,
        img: np.ndarray,
        method: Optional[str] = None,
    ) -> Tuple[np.ndarray, str]:
        """
        Apply a single augmentation to an image.
        Returns (augmented_image, method_name).
        """
        if method and method in self.individual_transforms:
            transform = self.individual_transforms[method]
        else:
            method = random.choice(list(self.individual_transforms.keys()))
            transform = self.individual_transforms[method]

        if HAS_ALBUMENTATIONS and isinstance(transform, A.Compose):
            # Albumentations Compose expects RGB, but we may have BGR from OpenCV
            augmented = transform(image=img)["image"]
        elif callable(transform):
            augmented = transform(img)
        else:
            augmented = img.copy()

        # Ensure output matches tile_size
        if augmented.shape[0] != self.tile_size or augmented.shape[1] != self.tile_size:
            if HAS_CV2:
                augmented = cv2.resize(augmented, (self.tile_size, self.tile_size))

        self.stats["total_augmented"] += 1
        self.stats["by_method"][method] = self.stats["by_method"].get(method, 0) + 1

        return augmented, method

    def augment_combined(self, img: np.ndarray) -> Tuple[np.ndarray, str]:
        """Apply the combined augmentation pipeline."""
        if self.combined_transform and HAS_ALBUMENTATIONS:
            augmented = self.combined_transform(image=img)["image"]
            method = "combined"
        else:
            # Chain 2-3 random transforms
            result = img.copy()
            methods_used = []
            n_transforms = random.randint(2, 3)
            for _ in range(n_transforms):
                result, m = self.augment_single(result)
                methods_used.append(m)
            augmented = result
            method = "+".join(methods_used)

        if augmented.shape[0] != self.tile_size or augmented.shape[1] != self.tile_size:
            if HAS_CV2:
                augmented = cv2.resize(augmented, (self.tile_size, self.tile_size))

        self.stats["total_augmented"] += 1
        self.stats["by_method"]["combined"] = self.stats["by_method"].get("combined", 0) + 1
        return augmented, method

    def augment_batch(
        self,
        img: np.ndarray,
        pool_images: Optional[List[np.ndarray]] = None,
    ) -> List[Tuple[np.ndarray, str]]:
        """
        Generate `augmentation_factor` augmented versions of an image.
        Pool images are used for mixup/cutmix if available.
        """
        results = []

        for i in range(self.augmentation_factor):
            if i == 0:
                # First augmentation: combined pipeline
                aug, method = self.augment_combined(img)
                results.append((aug, method))
            elif i == 1 and self.enable_mixup and pool_images:
                # Second: mixup with a random pool image
                partner = random.choice(pool_images)
                mixed, lam = mixup(img, partner, self.mixup_alpha)
                results.append((mixed, f"mixup_lam{lam:.2f}"))
                self.stats["by_method"]["mixup"] = self.stats["by_method"].get("mixup", 0) + 1
            elif i == 2 and self.enable_cutmix and pool_images:
                # Third: cutmix with a random pool image
                partner = random.choice(pool_images)
                cut, lam, bbox = cutmix(img, partner, self.cutmix_alpha)
                results.append((cut, f"cutmix_lam{lam:.2f}"))
                self.stats["by_method"]["cutmix"] = self.stats["by_method"].get("cutmix", 0) + 1
            else:
                # Additional: random individual transform
                aug, method = self.augment_single(img)
                results.append((aug, method))

        return results


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def discover_images(input_dir: Path) -> Dict[str, List[Path]]:
    """Discover images organized by class label subdirectories."""
    images_by_class: Dict[str, List[Path]] = {}

    for label_dir in sorted(input_dir.iterdir()):
        if not label_dir.is_dir():
            continue
        label = label_dir.name
        files = []
        for ext in SUPPORTED_EXTENSIONS:
            files.extend(label_dir.glob(f"*{ext}"))
            files.extend(label_dir.glob(f"*{ext.upper()}"))
        # Exclude label JSON files
        files = [f for f in files if not f.name.endswith("_label.json")]
        files = sorted(set(files))
        if files:
            images_by_class[label] = files

    return images_by_class


def run_augmentation(
    input_dir: Path,
    output_dir: Path,
    engine: AugmentationEngine,
    logger: logging.Logger,
    copy_originals: bool = True,
):
    """Run the full augmentation pipeline."""
    images_by_class = discover_images(input_dir)

    if not images_by_class:
        logger.error("No images found in %s. Ensure images are organized in class subdirectories.", input_dir)
        return

    logger.info("Discovered %d classes:", len(images_by_class))
    for label, files in images_by_class.items():
        logger.info("  %-25s %d images", label, len(files))

    # Pre-load a pool of images per class for mixup/cutmix
    image_pools: Dict[str, List[np.ndarray]] = {}
    for label, files in images_by_class.items():
        pool = []
        sample_files = random.sample(files, min(20, len(files)))
        for f in sample_files:
            img = load_image(f)
            if img is not None:
                pool.append(img)
        image_pools[label] = pool
        logger.debug("  Loaded %d pool images for class '%s'", len(pool), label)

    total_output = 0

    for label, files in images_by_class.items():
        label_output_dir = output_dir / label
        label_output_dir.mkdir(parents=True, exist_ok=True)

        logger.info("-" * 60)
        logger.info("Augmenting class: %s (%d images)", label, len(files))

        pool = image_pools.get(label, [])

        for idx, filepath in enumerate(files):
            img = load_image(filepath)
            if img is None:
                logger.warning("  Could not load: %s", filepath.name)
                continue

            # Copy original
            if copy_originals:
                orig_out = label_output_dir / filepath.name
                save_image(img, orig_out)
                orig_label = load_label(filepath) or {"label": label}
                orig_label["augmentation"] = "original"
                save_label(orig_label, orig_out)
                total_output += 1

            # Generate augmented versions
            augmented = engine.augment_batch(img, pool if pool else None)

            for aug_idx, (aug_img, method) in enumerate(augmented):
                aug_name = f"{filepath.stem}_aug{aug_idx:02d}_{method.split('_')[0]}{filepath.suffix}"
                aug_path = label_output_dir / aug_name
                save_image(aug_img, aug_path)

                aug_label = load_label(filepath) or {"label": label}
                aug_label["augmentation"] = method
                aug_label["source_image"] = filepath.name
                aug_label["augmentation_index"] = aug_idx
                save_label(aug_label, aug_path)

                total_output += 1

            if (idx + 1) % 100 == 0:
                logger.info("  Processed %d/%d images", idx + 1, len(files))

    # Write augmentation report
    report = {
        "pipeline": "NER-SHIELD Augmentation Pipeline",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "augmentation_factor": engine.augmentation_factor,
        "tile_size": engine.tile_size,
        "enable_mixup": engine.enable_mixup,
        "enable_cutmix": engine.enable_cutmix,
        "backend": "albumentations" if HAS_ALBUMENTATIONS else "numpy/opencv",
        "total_output_images": total_output,
        "statistics": engine.stats,
        "class_distribution": {
            label: len(list((output_dir / label).glob("*")))
            for label in images_by_class
            if (output_dir / label).exists()
        },
    }

    report_path = output_dir / "augmentation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    logger.info("=" * 60)
    logger.info("AUGMENTATION SUMMARY")
    logger.info("Total output images: %d", total_output)
    logger.info("Augmentation methods:")
    for method, count in sorted(engine.stats["by_method"].items()):
        logger.info("  %-25s %d", method, count)
    logger.info("Report: %s", report_path)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Data augmentation pipeline for satellite imagery",
    )
    parser.add_argument("--input-dir", type=str, required=True,
                        help="Input directory with class subdirectories")
    parser.add_argument("--output-dir", type=str, required=True,
                        help="Output directory for augmented data")
    parser.add_argument("--factor", type=int, default=3,
                        help="Augmentation factor (augmented copies per image, default: 3)")
    parser.add_argument("--tile-size", type=int, default=256,
                        help="Output tile size (default: 256)")
    parser.add_argument("--no-mixup", action="store_true",
                        help="Disable mixup augmentation")
    parser.add_argument("--no-cutmix", action="store_true",
                        help="Disable cutmix augmentation")
    parser.add_argument("--no-copy-originals", action="store_true",
                        help="Do not copy original images to output")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed for reproducibility")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    input_dir = Path(args.input_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD Augmentation Pipeline starting")
    logger.info("Input:  %s", input_dir)
    logger.info("Output: %s", output_dir)
    logger.info("Factor: %d | Tile size: %d", args.factor, args.tile_size)
    logger.info("Backend: %s", "albumentations" if HAS_ALBUMENTATIONS else "numpy/opencv fallback")

    if args.dry_run:
        logger.info("DRY RUN MODE")
        images = discover_images(input_dir)
        total = sum(len(v) for v in images.values())
        expected_output = total * (1 + args.factor)
        logger.info("Found %d images in %d classes", total, len(images))
        logger.info("Expected output: ~%d images", expected_output)
        for label, files in images.items():
            logger.info("  %-25s %d → ~%d", label, len(files), len(files) * (1 + args.factor))
        return

    engine = AugmentationEngine(
        tile_size=args.tile_size,
        augmentation_factor=args.factor,
        enable_mixup=not args.no_mixup,
        enable_cutmix=not args.no_cutmix,
        seed=args.seed,
    )

    run_augmentation(
        input_dir=input_dir,
        output_dir=output_dir,
        engine=engine,
        logger=logger,
        copy_originals=not args.no_copy_originals,
    )

    logger.info("Augmentation complete.")


if __name__ == "__main__":
    main()
