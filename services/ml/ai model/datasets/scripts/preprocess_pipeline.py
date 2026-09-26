#!/usr/bin/env python3
"""
NER-SHIELD: Full Preprocessing Pipeline
Pipeline stages:
  1. Format Detection → 2. CRS Normalization (EPSG:4326) →
  3. Resolution Normalization (256x256 or 512x512) → 4. Band Selection (RGB+NIR+SWIR) →
  5. Radiometric Correction → 6. Cloud Masking (>20% = discard) →
  7. Labeling (6 classes) → 8. Quality Validation

Usage:
    python preprocess_pipeline.py --input-dir ./raw --output-dir ./processed
    python preprocess_pipeline.py --input-dir ./raw --output-dir ./processed --tile-size 512
"""

import argparse
import json
import logging
import os
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import rasterio
    from rasterio.crs import CRS
    from rasterio.enums import Resampling
    from rasterio.transform import from_bounds
    from rasterio.warp import calculate_default_transform, reproject
    from rasterio.mask import mask as rasterio_mask
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None  # Allow large images
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    from osgeo import gdal, osr
    gdal.UseExceptions()
    HAS_GDAL = True
except ImportError:
    HAS_GDAL = False

warnings.filterwarnings("ignore", category=rasterio.errors.NotGeoreferencedWarning if HAS_RASTERIO else UserWarning)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TARGET_CRS = "EPSG:4326"
DEFAULT_TILE_SIZE = 256
CLOUD_THRESHOLD = 0.20  # Discard images with >20% cloud cover

# NER-SHIELD classification labels
CLASS_LABELS = {
    0: "normal",
    1: "landslide",
    2: "flood",
    3: "road_damage",
    4: "infrastructure_damage",
    5: "terrain_change",
}

# Reverse mapping
LABEL_TO_ID = {v: k for k, v in CLASS_LABELS.items()}

# Common satellite band mappings
BAND_CONFIGS = {
    "sentinel2": {
        "B02": "blue", "B03": "green", "B04": "red",
        "B08": "nir", "B11": "swir1", "B12": "swir2",
    },
    "landsat8": {
        "B2": "blue", "B3": "green", "B4": "red",
        "B5": "nir", "B6": "swir1", "B7": "swir2",
    },
    "liss3": {
        "B2": "green", "B3": "red", "B4": "nir", "B5": "swir",
    },
}

# Target band order for output
TARGET_BANDS = ["red", "green", "blue", "nir", "swir1"]

# Supported input formats
SUPPORTED_EXTENSIONS = {
    ".tif", ".tiff", ".geotiff",   # GeoTIFF
    ".jp2",                         # JPEG2000 (Sentinel-2)
    ".img",                         # ERDAS Imagine
    ".hdf", ".hdf5", ".he5",       # HDF
    ".nc", ".netcdf",              # NetCDF
    ".png", ".jpg", ".jpeg",       # Standard images
    ".bmp",
}


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"preprocess_{timestamp}.log"

    logger = logging.getLogger("preprocess")
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
# Stage 1: Format Detection
# ---------------------------------------------------------------------------

class FormatDetector:
    """Detect and classify input file formats."""

    @staticmethod
    def detect(filepath: Path) -> Dict[str, Any]:
        """Detect the format and properties of an input file."""
        info = {
            "path": str(filepath),
            "extension": filepath.suffix.lower(),
            "size_bytes": filepath.stat().st_size,
            "is_georeferenced": False,
            "format": "unknown",
            "bands": 0,
            "width": 0,
            "height": 0,
            "crs": None,
            "dtype": None,
        }

        ext = filepath.suffix.lower()

        # Try rasterio first (handles GeoTIFF, JP2, etc.)
        if HAS_RASTERIO:
            try:
                with rasterio.open(filepath) as src:
                    info["format"] = src.driver
                    info["bands"] = src.count
                    info["width"] = src.width
                    info["height"] = src.height
                    info["dtype"] = str(src.dtypes[0]) if src.dtypes else None
                    if src.crs:
                        info["crs"] = str(src.crs)
                        info["is_georeferenced"] = True
                    if src.transform:
                        info["transform"] = list(src.transform)
                    info["nodata"] = src.nodata
                    info["bounds"] = dict(zip(
                        ["left", "bottom", "right", "top"],
                        src.bounds,
                    ))
                    return info
            except Exception:
                pass

        # Fall back to PIL for standard image formats
        if HAS_PIL and ext in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}:
            try:
                with Image.open(filepath) as img:
                    info["format"] = img.format or "PIL"
                    info["width"], info["height"] = img.size
                    info["bands"] = len(img.getbands())
                    info["dtype"] = str(img.mode)
                    return info
            except Exception:
                pass

        # Fall back to OpenCV
        if HAS_CV2 and ext in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}:
            try:
                img = cv2.imread(str(filepath), cv2.IMREAD_UNCHANGED)
                if img is not None:
                    info["format"] = "OpenCV"
                    if img.ndim == 2:
                        info["height"], info["width"] = img.shape
                        info["bands"] = 1
                    else:
                        info["height"], info["width"], info["bands"] = img.shape
                    info["dtype"] = str(img.dtype)
                    return info
            except Exception:
                pass

        return info


# ---------------------------------------------------------------------------
# Stage 2: CRS Normalization
# ---------------------------------------------------------------------------

class CRSNormalizer:
    """Reproject rasters to target CRS (EPSG:4326)."""

    def __init__(self, target_crs: str = TARGET_CRS):
        self.target_crs = CRS.from_string(target_crs) if HAS_RASTERIO else target_crs

    def normalize(
        self,
        input_path: Path,
        output_path: Path,
        logger: logging.Logger,
    ) -> bool:
        """Reproject a raster to the target CRS."""
        if not HAS_RASTERIO:
            logger.warning("rasterio not available; skipping CRS normalization for %s",
                           input_path.name)
            return False

        try:
            with rasterio.open(input_path) as src:
                if src.crs and src.crs == self.target_crs:
                    logger.debug("  CRS already %s: %s", self.target_crs, input_path.name)
                    # Copy as-is
                    if input_path != output_path:
                        import shutil
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(input_path, output_path)
                    return True

                if not src.crs:
                    logger.warning("  No CRS defined for %s; assuming EPSG:4326",
                                   input_path.name)
                    src_crs = self.target_crs
                else:
                    src_crs = src.crs

                transform, width, height = calculate_default_transform(
                    src_crs, self.target_crs,
                    src.width, src.height,
                    *src.bounds,
                )

                kwargs = src.meta.copy()
                kwargs.update({
                    "crs": self.target_crs,
                    "transform": transform,
                    "width": width,
                    "height": height,
                })

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(output_path, "w", **kwargs) as dst:
                    for i in range(1, src.count + 1):
                        reproject(
                            source=rasterio.band(src, i),
                            destination=rasterio.band(dst, i),
                            src_transform=src.transform,
                            src_crs=src_crs,
                            dst_transform=transform,
                            dst_crs=self.target_crs,
                            resampling=Resampling.bilinear,
                        )

                logger.debug("  Reprojected %s → %s", src_crs, self.target_crs)
                return True

        except Exception as exc:
            logger.error("  CRS normalization failed for %s: %s", input_path.name, exc)
            return False


# ---------------------------------------------------------------------------
# Stage 3: Resolution Normalization (Tiling)
# ---------------------------------------------------------------------------

class ResolutionNormalizer:
    """Resize/tile images to standard dimensions."""

    def __init__(self, tile_size: int = DEFAULT_TILE_SIZE):
        self.tile_size = tile_size

    def normalize(
        self,
        input_path: Path,
        output_dir: Path,
        logger: logging.Logger,
    ) -> List[Path]:
        """
        Tile or resize an image to the target tile size.
        Returns list of output tile paths.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        tiles = []

        # Try rasterio for georeferenced data
        if HAS_RASTERIO:
            try:
                with rasterio.open(input_path) as src:
                    # If image is smaller than tile size, resize
                    if src.width <= self.tile_size and src.height <= self.tile_size:
                        return self._resize_rasterio(src, input_path, output_dir, logger)

                    # Tile the image
                    return self._tile_rasterio(src, input_path, output_dir, logger)
            except Exception:
                pass

        # Fall back to OpenCV/PIL
        if HAS_CV2:
            try:
                return self._tile_opencv(input_path, output_dir, logger)
            except Exception:
                pass

        if HAS_PIL:
            try:
                return self._tile_pil(input_path, output_dir, logger)
            except Exception as exc:
                logger.error("  Resolution normalization failed for %s: %s",
                             input_path.name, exc)

        return tiles

    def _resize_rasterio(
        self, src, input_path: Path, output_dir: Path, logger: logging.Logger,
    ) -> List[Path]:
        """Resize a small rasterio dataset to tile_size."""
        data = src.read(
            out_shape=(src.count, self.tile_size, self.tile_size),
            resampling=Resampling.bilinear,
        )

        output_path = output_dir / f"{input_path.stem}_resized.tif"
        kwargs = src.meta.copy()
        kwargs.update({
            "width": self.tile_size,
            "height": self.tile_size,
            "transform": from_bounds(*src.bounds, self.tile_size, self.tile_size),
        })

        with rasterio.open(output_path, "w", **kwargs) as dst:
            dst.write(data)

        logger.debug("  Resized %s to %dx%d", input_path.name, self.tile_size, self.tile_size)
        return [output_path]

    def _tile_rasterio(
        self, src, input_path: Path, output_dir: Path, logger: logging.Logger,
    ) -> List[Path]:
        """Tile a large rasterio dataset into tile_size patches."""
        tiles = []
        ts = self.tile_size

        for row in range(0, src.height, ts):
            for col in range(0, src.width, ts):
                window = rasterio.windows.Window(col, row, ts, ts)
                # Clip window to image bounds
                window = window.intersection(
                    rasterio.windows.Window(0, 0, src.width, src.height)
                )

                if window.width < ts * 0.5 or window.height < ts * 0.5:
                    continue  # Skip very small edge tiles

                data = src.read(window=window)

                # Pad if needed
                if data.shape[1] < ts or data.shape[2] < ts:
                    padded = np.zeros((data.shape[0], ts, ts), dtype=data.dtype)
                    padded[:, :data.shape[1], :data.shape[2]] = data
                    data = padded

                tile_name = f"{input_path.stem}_tile_{row:05d}_{col:05d}.tif"
                tile_path = output_dir / tile_name

                kwargs = src.meta.copy()
                transform = src.window_transform(window)
                kwargs.update({
                    "width": ts,
                    "height": ts,
                    "transform": transform,
                })

                with rasterio.open(tile_path, "w", **kwargs) as dst:
                    dst.write(data)

                tiles.append(tile_path)

        logger.debug("  Tiled %s → %d tiles (%dx%d)",
                     input_path.name, len(tiles), ts, ts)
        return tiles

    def _tile_opencv(
        self, input_path: Path, output_dir: Path, logger: logging.Logger,
    ) -> List[Path]:
        """Tile using OpenCV for standard image formats."""
        img = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
        if img is None:
            return []

        ts = self.tile_size
        tiles = []

        if img.ndim == 2:
            h, w = img.shape
        else:
            h, w = img.shape[:2]

        # If smaller, resize
        if h <= ts and w <= ts:
            resized = cv2.resize(img, (ts, ts), interpolation=cv2.INTER_LINEAR)
            out_path = output_dir / f"{input_path.stem}_resized.png"
            cv2.imwrite(str(out_path), resized)
            return [out_path]

        for row in range(0, h, ts):
            for col in range(0, w, ts):
                patch = img[row:row + ts, col:col + ts]
                ph = patch.shape[0]
                pw = patch.shape[1]

                if ph < ts * 0.5 or pw < ts * 0.5:
                    continue

                if ph < ts or pw < ts:
                    if img.ndim == 2:
                        padded = np.zeros((ts, ts), dtype=img.dtype)
                        padded[:ph, :pw] = patch
                    else:
                        padded = np.zeros((ts, ts, img.shape[2]), dtype=img.dtype)
                        padded[:ph, :pw] = patch
                    patch = padded

                tile_name = f"{input_path.stem}_tile_{row:05d}_{col:05d}.png"
                tile_path = output_dir / tile_name
                cv2.imwrite(str(tile_path), patch)
                tiles.append(tile_path)

        logger.debug("  Tiled %s → %d tiles (OpenCV)", input_path.name, len(tiles))
        return tiles

    def _tile_pil(
        self, input_path: Path, output_dir: Path, logger: logging.Logger,
    ) -> List[Path]:
        """Tile using PIL as a fallback."""
        with Image.open(input_path) as img:
            w, h = img.size
            ts = self.tile_size
            tiles = []

            if w <= ts and h <= ts:
                resized = img.resize((ts, ts), Image.BILINEAR)
                out_path = output_dir / f"{input_path.stem}_resized.png"
                resized.save(out_path)
                return [out_path]

            for row in range(0, h, ts):
                for col in range(0, w, ts):
                    box = (col, row, min(col + ts, w), min(row + ts, h))
                    patch = img.crop(box)
                    pw, ph = patch.size

                    if pw < ts * 0.5 or ph < ts * 0.5:
                        continue

                    if pw < ts or ph < ts:
                        padded = Image.new(img.mode, (ts, ts), 0)
                        padded.paste(patch, (0, 0))
                        patch = padded

                    tile_name = f"{input_path.stem}_tile_{row:05d}_{col:05d}.png"
                    tile_path = output_dir / tile_name
                    patch.save(tile_path)
                    tiles.append(tile_path)

            logger.debug("  Tiled %s → %d tiles (PIL)", input_path.name, len(tiles))
            return tiles


# ---------------------------------------------------------------------------
# Stage 4: Band Selection
# ---------------------------------------------------------------------------

class BandSelector:
    """Select and reorder bands to RGB+NIR+SWIR."""

    @staticmethod
    def select(
        input_path: Path,
        output_path: Path,
        band_config: Optional[Dict[str, str]] = None,
        logger: Optional[logging.Logger] = None,
    ) -> bool:
        """
        Select target bands from a multi-band raster.
        If fewer bands available, pass through all available bands.
        """
        if not HAS_RASTERIO:
            return False

        try:
            with rasterio.open(input_path) as src:
                n_bands = src.count

                if n_bands <= 5:
                    # Already has manageable number of bands; keep all
                    if input_path != output_path:
                        import shutil
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(input_path, output_path)
                    return True

                # For multi-band images, select RGB+NIR+SWIR (bands 1-5 typically)
                # Adjust indices based on known sensor configurations
                if band_config:
                    target_indices = []
                    band_names = list(src.descriptions) if src.descriptions else []
                    for target_band in TARGET_BANDS:
                        for band_id, band_name in band_config.items():
                            if band_name == target_band:
                                # Find the band index
                                for idx, desc in enumerate(band_names, 1):
                                    if desc and band_id in desc:
                                        target_indices.append(idx)
                                        break
                                else:
                                    # Guess based on common ordering
                                    common_order = {"red": 1, "green": 2, "blue": 3,
                                                    "nir": 4, "swir1": 5}
                                    if target_band in common_order:
                                        bi = common_order[target_band]
                                        if bi <= n_bands:
                                            target_indices.append(bi)
                else:
                    # Default: take first 5 bands (or all if fewer)
                    target_indices = list(range(1, min(n_bands + 1, 6)))

                if not target_indices:
                    target_indices = list(range(1, min(n_bands + 1, 6)))

                data = src.read(target_indices)

                kwargs = src.meta.copy()
                kwargs["count"] = len(target_indices)

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(output_path, "w", **kwargs) as dst:
                    dst.write(data)

                if logger:
                    logger.debug("  Selected bands %s from %d-band image",
                                 target_indices, n_bands)
                return True

        except Exception as exc:
            if logger:
                logger.error("  Band selection failed for %s: %s", input_path.name, exc)
            return False


# ---------------------------------------------------------------------------
# Stage 5: Radiometric Correction
# ---------------------------------------------------------------------------

class RadiometricCorrector:
    """Apply radiometric corrections to satellite imagery."""

    @staticmethod
    def correct(
        input_path: Path,
        output_path: Path,
        logger: logging.Logger,
        method: str = "minmax",
    ) -> bool:
        """
        Apply radiometric correction.
        Methods: 'minmax' (min-max normalization), 'histogram' (histogram equalization),
                 'toa' (top-of-atmosphere), 'dos' (dark object subtraction).
        """
        if not HAS_RASTERIO:
            return False

        try:
            with rasterio.open(input_path) as src:
                data = src.read().astype(np.float32)
                nodata = src.nodata

                # Mask nodata
                if nodata is not None:
                    mask = data == nodata
                else:
                    mask = np.zeros_like(data, dtype=bool)

                corrected = np.copy(data)

                if method == "minmax":
                    # Per-band min-max normalization to [0, 1] then scale to uint16
                    for b in range(data.shape[0]):
                        band = data[b]
                        valid = band[~mask[b]]
                        if valid.size == 0:
                            continue
                        bmin = np.percentile(valid, 2)
                        bmax = np.percentile(valid, 98)
                        if bmax - bmin > 0:
                            corrected[b] = np.clip(
                                (band - bmin) / (bmax - bmin), 0, 1
                            ) * 65535
                        corrected[b][mask[b]] = 0

                elif method == "dos":
                    # Dark Object Subtraction
                    for b in range(data.shape[0]):
                        band = data[b]
                        valid = band[~mask[b]]
                        if valid.size == 0:
                            continue
                        dark_obj = np.percentile(valid, 1)
                        corrected[b] = np.clip(band - dark_obj, 0, None)
                        bmax = np.percentile(corrected[b][~mask[b]], 99)
                        if bmax > 0:
                            corrected[b] = (corrected[b] / bmax) * 65535
                        corrected[b][mask[b]] = 0

                elif method == "histogram":
                    for b in range(data.shape[0]):
                        band = data[b]
                        valid = band[~mask[b]]
                        if valid.size == 0:
                            continue
                        # Histogram equalization
                        hist, bins = np.histogram(valid, bins=65536, range=(valid.min(), valid.max()))
                        cdf = hist.cumsum()
                        cdf_normalized = cdf / cdf[-1] * 65535
                        # Interpolate
                        corrected[b] = np.interp(band, bins[:-1], cdf_normalized)
                        corrected[b][mask[b]] = 0

                corrected = corrected.astype(np.uint16)

                kwargs = src.meta.copy()
                kwargs["dtype"] = "uint16"
                kwargs["nodata"] = 0

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(output_path, "w", **kwargs) as dst:
                    dst.write(corrected)

                logger.debug("  Radiometric correction (%s) applied: %s", method, input_path.name)
                return True

        except Exception as exc:
            logger.error("  Radiometric correction failed for %s: %s", input_path.name, exc)
            return False


# ---------------------------------------------------------------------------
# Stage 6: Cloud Masking
# ---------------------------------------------------------------------------

class CloudMasker:
    """Detect and mask clouds; discard images exceeding cloud threshold."""

    @staticmethod
    def estimate_cloud_cover(
        data: np.ndarray,
        nodata_val: Optional[float] = None,
    ) -> float:
        """
        Estimate cloud cover percentage using brightness thresholding.
        A simple heuristic: pixels brighter than the 95th percentile
        across visible bands are likely clouds.
        """
        if data.ndim == 2:
            bands = [data]
        elif data.shape[0] >= 3:
            bands = [data[0], data[1], data[2]]  # Use first 3 bands (typically RGB)
        else:
            bands = [data[i] for i in range(data.shape[0])]

        combined = np.mean(bands, axis=0).astype(np.float32)

        if nodata_val is not None:
            valid_mask = combined != nodata_val
        else:
            valid_mask = combined > 0

        valid_pixels = combined[valid_mask]
        if valid_pixels.size == 0:
            return 1.0  # All nodata = treat as 100% cloud

        threshold = np.percentile(valid_pixels, 95)
        # High-brightness pixels (likely clouds)
        bright_mask = (combined > threshold * 0.85) & valid_mask

        cloud_fraction = bright_mask.sum() / valid_mask.sum()
        return float(cloud_fraction)

    @staticmethod
    def mask_clouds(
        input_path: Path,
        output_path: Path,
        logger: logging.Logger,
        threshold: float = CLOUD_THRESHOLD,
    ) -> Optional[Dict[str, Any]]:
        """
        Estimate cloud cover and either pass or discard the image.
        Returns metadata dict or None if discarded.
        """
        if not HAS_RASTERIO:
            # Pass through without cloud masking
            import shutil
            output_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(input_path, output_path)
            return {"cloud_cover": -1, "action": "passed_no_rasterio"}

        try:
            with rasterio.open(input_path) as src:
                data = src.read()
                cloud_pct = CloudMasker.estimate_cloud_cover(data, src.nodata)

                if cloud_pct > threshold:
                    logger.info("  DISCARDED %s: cloud cover %.1f%% > %.0f%% threshold",
                                input_path.name, cloud_pct * 100, threshold * 100)
                    return None

                # Apply simple cloud mask (set bright pixels to nodata)
                if data.shape[0] >= 3:
                    brightness = np.mean(data[:3].astype(np.float32), axis=0)
                    valid = brightness[brightness > 0]
                    if valid.size > 0:
                        cloud_thresh = np.percentile(valid, 95) * 0.9
                        cloud_mask = brightness > cloud_thresh
                        for b in range(data.shape[0]):
                            data[b][cloud_mask] = 0

                kwargs = src.meta.copy()
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(output_path, "w", **kwargs) as dst:
                    dst.write(data)

                logger.debug("  Cloud cover %.1f%% (OK): %s",
                             cloud_pct * 100, input_path.name)
                return {
                    "cloud_cover_pct": round(cloud_pct * 100, 2),
                    "action": "passed",
                }

        except Exception as exc:
            logger.error("  Cloud masking failed for %s: %s", input_path.name, exc)
            return {"cloud_cover": -1, "action": "error", "error": str(exc)}


# ---------------------------------------------------------------------------
# Stage 7: Labeling
# ---------------------------------------------------------------------------

class Labeler:
    """Assign class labels based on source directory and filename conventions."""

    # Keywords for automatic label inference
    LABEL_KEYWORDS = {
        "landslide": ["landslide", "slide", "debris_flow", "mass_movement", "lhz"],
        "flood": ["flood", "inundation", "water_level", "sen1flood", "floodnet"],
        "road_damage": ["road_damage", "rdd", "road_crack", "pothole", "road_defect"],
        "infrastructure_damage": ["building_damage", "infrastructure", "xbd",
                                   "damage_assessment", "structural"],
        "terrain_change": ["change_detection", "levir", "dsifn", "s2looking",
                           "terrain_change", "cdd"],
        "normal": ["normal", "baseline", "eurosat", "ucmerced", "patternnet",
                    "resisc", "bigearthnet", "lulc"],
    }

    @staticmethod
    def infer_label(filepath: Path, source_dir: Optional[str] = None) -> str:
        """Infer class label from filepath and source directory."""
        search_text = (str(filepath) + " " + (source_dir or "")).lower()

        for label, keywords in Labeler.LABEL_KEYWORDS.items():
            for kw in keywords:
                if kw in search_text:
                    return label

        return "normal"  # Default to normal if no match

    @staticmethod
    def write_label_file(
        image_path: Path,
        label: str,
        output_dir: Path,
        metadata: Optional[Dict] = None,
    ) -> Path:
        """Write a label JSON sidecar file for an image."""
        label_data = {
            "image": str(image_path.name),
            "label": label,
            "label_id": LABEL_TO_ID.get(label, 0),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if metadata:
            label_data.update(metadata)

        label_path = output_dir / f"{image_path.stem}_label.json"
        with open(label_path, "w", encoding="utf-8") as f:
            json.dump(label_data, f, indent=2)

        return label_path


# ---------------------------------------------------------------------------
# Stage 8: Quality Validation
# ---------------------------------------------------------------------------

class QualityValidator:
    """Validate processed images for quality issues."""

    @staticmethod
    def validate(filepath: Path, logger: logging.Logger) -> Dict[str, Any]:
        """Run quality checks on a processed image."""
        result = {
            "path": str(filepath),
            "valid": True,
            "issues": [],
        }

        # Check file exists and has content
        if not filepath.exists():
            result["valid"] = False
            result["issues"].append("file_not_found")
            return result

        if filepath.stat().st_size < 100:
            result["valid"] = False
            result["issues"].append("file_too_small")
            return result

        # Try to read the image
        data = None
        if HAS_RASTERIO:
            try:
                with rasterio.open(filepath) as src:
                    data = src.read()
                    # Check for all-black
                    if np.all(data == 0):
                        result["valid"] = False
                        result["issues"].append("all_black")
                    # Check for all-white
                    if data.dtype == np.uint8 and np.all(data == 255):
                        result["valid"] = False
                        result["issues"].append("all_white")
                    elif data.dtype == np.uint16 and np.all(data == 65535):
                        result["valid"] = False
                        result["issues"].append("all_white")
                    # Check for zero variance
                    if np.std(data.astype(np.float64)) < 1e-6:
                        result["valid"] = False
                        result["issues"].append("zero_variance")
                    # Check aspect ratio
                    if src.width > 0 and src.height > 0:
                        ar = max(src.width, src.height) / min(src.width, src.height)
                        if ar > 10:
                            result["issues"].append("extreme_aspect_ratio")
                    # Check georeferencing
                    if not src.crs:
                        result["issues"].append("missing_crs")
            except Exception as exc:
                result["valid"] = False
                result["issues"].append(f"read_error:{exc}")
                return result

        elif HAS_CV2:
            try:
                img = cv2.imread(str(filepath), cv2.IMREAD_UNCHANGED)
                if img is None:
                    result["valid"] = False
                    result["issues"].append("corrupt_file")
                    return result
                data = img
                if np.all(data == 0):
                    result["valid"] = False
                    result["issues"].append("all_black")
                if data.dtype == np.uint8 and np.all(data == 255):
                    result["valid"] = False
                    result["issues"].append("all_white")
                if np.std(data.astype(np.float64)) < 1e-6:
                    result["valid"] = False
                    result["issues"].append("zero_variance")
            except Exception as exc:
                result["valid"] = False
                result["issues"].append(f"read_error:{exc}")

        return result


# ---------------------------------------------------------------------------
# Pipeline Orchestrator
# ---------------------------------------------------------------------------

class PreprocessPipeline:
    """Orchestrate the full preprocessing pipeline."""

    def __init__(
        self,
        input_dir: Path,
        output_dir: Path,
        tile_size: int = DEFAULT_TILE_SIZE,
        cloud_threshold: float = CLOUD_THRESHOLD,
        radiometric_method: str = "minmax",
        logger: Optional[logging.Logger] = None,
    ):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.tile_size = tile_size
        self.cloud_threshold = cloud_threshold
        self.radiometric_method = radiometric_method
        self.logger = logger or logging.getLogger("preprocess")

        self.format_detector = FormatDetector()
        self.crs_normalizer = CRSNormalizer()
        self.resolution_normalizer = ResolutionNormalizer(tile_size)
        self.band_selector = BandSelector()
        self.radiometric_corrector = RadiometricCorrector()
        self.cloud_masker = CloudMasker()
        self.labeler = Labeler()
        self.quality_validator = QualityValidator()

        # Intermediate directories
        self.staging_dir = output_dir / "_staging"
        self.staging_dir.mkdir(parents=True, exist_ok=True)

        # Statistics
        self.stats = {
            "total_files": 0,
            "processed": 0,
            "discarded_cloud": 0,
            "discarded_quality": 0,
            "failed": 0,
            "tiles_created": 0,
            "by_label": {label: 0 for label in CLASS_LABELS.values()},
        }

    def discover_files(self) -> List[Path]:
        """Discover all supported image files in the input directory."""
        files = []
        for ext in SUPPORTED_EXTENSIONS:
            files.extend(self.input_dir.rglob(f"*{ext}"))
            files.extend(self.input_dir.rglob(f"*{ext.upper()}"))
        files = sorted(set(files))
        self.logger.info("Discovered %d supported files in %s", len(files), self.input_dir)
        return files

    def process_file(self, filepath: Path) -> List[Dict[str, Any]]:
        """Process a single file through all pipeline stages."""
        results = []
        self.stats["total_files"] += 1

        self.logger.info("Processing: %s", filepath.name)

        # Stage 1: Format Detection
        info = self.format_detector.detect(filepath)
        self.logger.debug("  Format: %s, %dx%d, %d bands",
                         info["format"], info["width"], info["height"], info["bands"])

        if info["format"] == "unknown":
            self.logger.warning("  Skipping unsupported format: %s", filepath.name)
            self.stats["failed"] += 1
            return results

        # Stage 2: CRS Normalization
        crs_output = self.staging_dir / f"crs_{filepath.stem}.tif"
        if info["is_georeferenced"]:
            success = self.crs_normalizer.normalize(filepath, crs_output, self.logger)
            if not success:
                crs_output = filepath  # Use original if normalization fails
        else:
            crs_output = filepath

        # Stage 3: Resolution Normalization (Tiling)
        tiles_dir = self.staging_dir / f"tiles_{filepath.stem}"
        tiles = self.resolution_normalizer.normalize(crs_output, tiles_dir, self.logger)
        if not tiles:
            tiles = [crs_output]

        for tile_path in tiles:
            # Stage 4: Band Selection
            bands_output = self.staging_dir / f"bands_{tile_path.stem}.tif"
            BandSelector.select(tile_path, bands_output, logger=self.logger)
            if not bands_output.exists():
                bands_output = tile_path

            # Stage 5: Radiometric Correction
            rad_output = self.staging_dir / f"rad_{tile_path.stem}.tif"
            RadiometricCorrector.correct(
                bands_output, rad_output, self.logger, self.radiometric_method,
            )
            if not rad_output.exists():
                rad_output = bands_output

            # Stage 6: Cloud Masking
            cloud_output = self.staging_dir / f"cloud_{tile_path.stem}.tif"
            cloud_result = CloudMasker.mask_clouds(
                rad_output, cloud_output, self.logger, self.cloud_threshold,
            )

            if cloud_result is None:
                self.stats["discarded_cloud"] += 1
                continue

            if not cloud_output.exists():
                cloud_output = rad_output

            # Stage 7: Labeling
            label = self.labeler.infer_label(filepath)

            # Stage 8: Quality Validation
            validation = self.quality_validator.validate(cloud_output, self.logger)

            if not validation["valid"]:
                self.logger.warning("  Quality check failed for %s: %s",
                                    tile_path.name, validation["issues"])
                self.stats["discarded_quality"] += 1
                continue

            # Move to final output directory
            label_dir = self.output_dir / label
            label_dir.mkdir(parents=True, exist_ok=True)

            final_name = f"{filepath.stem}_{tile_path.stem}.tif"
            final_path = label_dir / final_name

            import shutil
            shutil.copy2(cloud_output, final_path)

            # Write label sidecar
            self.labeler.write_label_file(
                final_path, label, label_dir,
                metadata={
                    "source_file": str(filepath),
                    "cloud_cover": cloud_result.get("cloud_cover_pct", -1),
                    "tile_size": self.tile_size,
                    "quality_issues": validation.get("issues", []),
                },
            )

            self.stats["processed"] += 1
            self.stats["tiles_created"] += 1
            self.stats["by_label"][label] += 1

            results.append({
                "source": str(filepath),
                "output": str(final_path),
                "label": label,
                "cloud_cover": cloud_result.get("cloud_cover_pct", -1),
                "quality_issues": validation.get("issues", []),
            })

        # Clean up staging files for this input
        for f in self.staging_dir.glob(f"*{filepath.stem}*"):
            try:
                if f.is_file():
                    f.unlink()
                elif f.is_dir():
                    import shutil
                    shutil.rmtree(f)
            except OSError:
                pass

        return results

    def run(self) -> Dict[str, Any]:
        """Run the full pipeline on all discovered files."""
        files = self.discover_files()
        all_results = []

        for idx, filepath in enumerate(files, 1):
            self.logger.info("[%d/%d] %s", idx, len(files), filepath.name)
            try:
                results = self.process_file(filepath)
                all_results.extend(results)
            except Exception as exc:
                self.logger.error("  Pipeline error for %s: %s",
                                  filepath.name, exc, exc_info=True)
                self.stats["failed"] += 1

        # Clean up staging directory
        import shutil
        if self.staging_dir.exists():
            shutil.rmtree(self.staging_dir, ignore_errors=True)

        # Write processing report
        report = {
            "pipeline": "NER-SHIELD Preprocessing Pipeline",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "input_dir": str(self.input_dir),
            "output_dir": str(self.output_dir),
            "tile_size": self.tile_size,
            "cloud_threshold_pct": self.cloud_threshold * 100,
            "radiometric_method": self.radiometric_method,
            "target_crs": TARGET_CRS,
            "class_labels": CLASS_LABELS,
            "statistics": self.stats,
            "processed_files": all_results,
        }

        report_path = self.output_dir / "preprocessing_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)

        self._print_summary()
        return report

    def _print_summary(self):
        self.logger.info("=" * 60)
        self.logger.info("PREPROCESSING PIPELINE SUMMARY")
        self.logger.info("=" * 60)
        self.logger.info("Total input files:    %d", self.stats["total_files"])
        self.logger.info("Successfully processed: %d", self.stats["processed"])
        self.logger.info("Tiles created:         %d", self.stats["tiles_created"])
        self.logger.info("Discarded (cloud):     %d", self.stats["discarded_cloud"])
        self.logger.info("Discarded (quality):   %d", self.stats["discarded_quality"])
        self.logger.info("Failed:                %d", self.stats["failed"])
        self.logger.info("Labels:")
        for label, count in self.stats["by_label"].items():
            self.logger.info("  %-25s %d", label, count)
        self.logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Full preprocessing pipeline for satellite imagery",
    )
    parser.add_argument("--input-dir", type=str, required=True,
                        help="Input directory containing raw datasets")
    parser.add_argument("--output-dir", type=str, required=True,
                        help="Output directory for processed data")
    parser.add_argument("--tile-size", type=int, default=DEFAULT_TILE_SIZE,
                        choices=[256, 512],
                        help="Output tile size (default: 256)")
    parser.add_argument("--cloud-threshold", type=float, default=CLOUD_THRESHOLD,
                        help="Max cloud cover fraction (default: 0.20)")
    parser.add_argument("--radiometric-method", type=str, default="minmax",
                        choices=["minmax", "dos", "histogram"],
                        help="Radiometric correction method (default: minmax)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Discover and report files without processing")
    return parser.parse_args()


def main():
    args = parse_args()
    input_dir = Path(args.input_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD Preprocessing Pipeline starting")
    logger.info("Input:  %s", input_dir)
    logger.info("Output: %s", output_dir)
    logger.info("Tile size: %d | Cloud threshold: %.0f%% | Radiometric: %s",
                args.tile_size, args.cloud_threshold * 100, args.radiometric_method)

    pipeline = PreprocessPipeline(
        input_dir=input_dir,
        output_dir=output_dir,
        tile_size=args.tile_size,
        cloud_threshold=args.cloud_threshold,
        radiometric_method=args.radiometric_method,
        logger=logger,
    )

    if args.dry_run:
        logger.info("DRY RUN MODE")
        files = pipeline.discover_files()
        for f in files[:50]:
            info = FormatDetector.detect(f)
            logger.info("  %s — %s %dx%d %db",
                        f.name, info["format"], info["width"], info["height"], info["bands"])
        if len(files) > 50:
            logger.info("  ... and %d more files", len(files) - 50)
        return

    report = pipeline.run()
    logger.info("Preprocessing complete. Report: %s",
                output_dir / "preprocessing_report.json")


if __name__ == "__main__":
    main()
