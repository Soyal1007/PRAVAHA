#!/usr/bin/env python3
"""
NER-SHIELD: Dataset Validation Tool
Validates processed datasets for common quality issues:
  - Corrupt/unreadable files
  - All-black or all-white images
  - Missing georeference data
  - Zero-variance images
  - Extreme aspect ratios
  - Missing labels
  - Class imbalance warnings
  - File format consistency

Generates a comprehensive validation report.

Usage:
    python validate_dataset.py --input-dir ./processed
    python validate_dataset.py --input-dir ./processed --output-report ./validation_report.json
"""

import argparse
import collections
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".jp2"}

CLASS_LABELS = ["normal", "landslide", "flood", "road_damage",
                "infrastructure_damage", "terrain_change"]

# Thresholds
MIN_FILE_SIZE = 100             # bytes
MAX_ASPECT_RATIO = 10.0         # max ratio of width/height
MIN_IMAGE_DIM = 16              # minimum dimension in pixels
BLACK_THRESHOLD = 0.01          # fraction of non-zero pixels to be "all black"
WHITE_THRESHOLD_U8 = 250        # uint8 mean above this is "all white"
WHITE_THRESHOLD_U16 = 64000     # uint16 mean above this is "all white"
VARIANCE_THRESHOLD = 1e-6       # below this is "zero variance"
IMBALANCE_RATIO_WARN = 10.0    # warn if largest class / smallest class > this


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Optional[Path] = None) -> logging.Logger:
    logger = logging.getLogger("validate_dataset")
    logger.setLevel(logging.DEBUG)

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    if output_dir:
        log_dir = output_dir if output_dir.is_dir() else output_dir.parent
        log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"validate_{timestamp}.log"
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    return logger


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

class ImageValidator:
    """Validates individual image files."""

    @staticmethod
    def validate(filepath: Path) -> Dict[str, Any]:
        """
        Run all validation checks on a single image file.
        Returns a dict with validation results and any issues found.
        """
        result = {
            "path": str(filepath),
            "filename": filepath.name,
            "extension": filepath.suffix.lower(),
            "valid": True,
            "issues": [],
            "warnings": [],
            "properties": {},
        }

        # Check 1: File exists and has content
        if not filepath.exists():
            result["valid"] = False
            result["issues"].append("file_not_found")
            return result

        file_size = filepath.stat().st_size
        result["properties"]["file_size_bytes"] = file_size

        if file_size < MIN_FILE_SIZE:
            result["valid"] = False
            result["issues"].append(f"file_too_small ({file_size} bytes)")
            return result

        # Check 2: File is readable
        data = None
        width = height = bands = 0
        dtype_str = ""
        has_crs = False

        # Try rasterio first (best for GeoTIFF)
        if HAS_RASTERIO:
            try:
                with rasterio.open(filepath) as src:
                    width = src.width
                    height = src.height
                    bands = src.count
                    dtype_str = str(src.dtypes[0]) if src.dtypes else "unknown"
                    has_crs = src.crs is not None

                    result["properties"]["width"] = width
                    result["properties"]["height"] = height
                    result["properties"]["bands"] = bands
                    result["properties"]["dtype"] = dtype_str
                    result["properties"]["crs"] = str(src.crs) if src.crs else None
                    result["properties"]["driver"] = src.driver
                    result["properties"]["nodata"] = src.nodata

                    # Read full data for pixel-level checks
                    try:
                        data = src.read()
                    except Exception as read_exc:
                        result["valid"] = False
                        result["issues"].append(f"corrupt_data: cannot read pixels ({read_exc})")
                        return result

            except rasterio.errors.RasterioIOError as exc:
                result["valid"] = False
                result["issues"].append(f"corrupt_file: rasterio cannot open ({exc})")
                # Try fallback
                data = None
            except Exception as exc:
                result["valid"] = False
                result["issues"].append(f"read_error: {exc}")
                data = None

        # Fallback to OpenCV
        if data is None and HAS_CV2:
            try:
                img = cv2.imread(str(filepath), cv2.IMREAD_UNCHANGED)
                if img is None:
                    result["valid"] = False
                    result["issues"].append("corrupt_file: opencv cannot read")
                    return result
                if img.ndim == 2:
                    height, width = img.shape
                    bands = 1
                    data = img.reshape(1, height, width)
                else:
                    height, width, bands = img.shape
                    data = img.transpose(2, 0, 1)  # HWC -> CHW
                dtype_str = str(img.dtype)
                result["properties"]["width"] = width
                result["properties"]["height"] = height
                result["properties"]["bands"] = bands
                result["properties"]["dtype"] = dtype_str
            except Exception as exc:
                result["valid"] = False
                result["issues"].append(f"corrupt_file: cannot read ({exc})")
                return result

        # Fallback to PIL
        if data is None and HAS_PIL:
            try:
                with Image.open(filepath) as pil_img:
                    width, height = pil_img.size
                    bands = len(pil_img.getbands())
                    data = np.array(pil_img)
                    if data.ndim == 2:
                        data = data.reshape(1, height, width)
                    else:
                        data = data.transpose(2, 0, 1)
                    dtype_str = str(data.dtype)
                    result["properties"]["width"] = width
                    result["properties"]["height"] = height
                    result["properties"]["bands"] = bands
                    result["properties"]["dtype"] = dtype_str
            except Exception as exc:
                result["valid"] = False
                result["issues"].append(f"corrupt_file: PIL cannot read ({exc})")
                return result

        if data is None:
            result["valid"] = False
            result["issues"].append("no_reader_available")
            return result

        # Check 3: Minimum dimensions
        if width < MIN_IMAGE_DIM or height < MIN_IMAGE_DIM:
            result["valid"] = False
            result["issues"].append(f"too_small ({width}x{height}, min {MIN_IMAGE_DIM})")

        # Check 4: Extreme aspect ratio
        if width > 0 and height > 0:
            ar = max(width, height) / min(width, height)
            result["properties"]["aspect_ratio"] = round(ar, 2)
            if ar > MAX_ASPECT_RATIO:
                result["warnings"].append(f"extreme_aspect_ratio ({ar:.1f})")

        # Check 5: All-black check
        data_float = data.astype(np.float64)
        nonzero_frac = np.count_nonzero(data) / data.size
        result["properties"]["nonzero_fraction"] = round(nonzero_frac, 6)

        if nonzero_frac < BLACK_THRESHOLD:
            result["valid"] = False
            result["issues"].append(f"all_black (nonzero fraction: {nonzero_frac:.4f})")

        # Check 6: All-white check
        mean_val = np.mean(data_float)
        result["properties"]["mean_value"] = round(float(mean_val), 4)

        if dtype_str in ("uint8",) and mean_val > WHITE_THRESHOLD_U8:
            result["valid"] = False
            result["issues"].append(f"all_white (mean: {mean_val:.1f})")
        elif dtype_str in ("uint16",) and mean_val > WHITE_THRESHOLD_U16:
            result["valid"] = False
            result["issues"].append(f"all_white (mean: {mean_val:.1f})")

        # Check 7: Zero-variance check
        variance = float(np.var(data_float))
        result["properties"]["variance"] = round(variance, 6)

        if variance < VARIANCE_THRESHOLD:
            result["valid"] = False
            result["issues"].append(f"zero_variance ({variance:.2e})")

        # Check 8: Missing georeference (for GeoTIFF)
        if filepath.suffix.lower() in (".tif", ".tiff", ".geotiff"):
            if not has_crs:
                result["warnings"].append("missing_georef")

        # Check 9: NaN/Inf values
        if np.any(np.isnan(data_float)) or np.any(np.isinf(data_float)):
            result["warnings"].append("contains_nan_or_inf")

        # Compute per-band statistics
        band_stats = []
        for b in range(min(bands, data.shape[0])):
            band_data = data_float[b]
            band_stats.append({
                "band": b + 1,
                "min": round(float(np.min(band_data)), 4),
                "max": round(float(np.max(band_data)), 4),
                "mean": round(float(np.mean(band_data)), 4),
                "std": round(float(np.std(band_data)), 4),
            })
        result["properties"]["band_stats"] = band_stats

        return result


class DatasetValidator:
    """Validates an entire dataset directory."""

    def __init__(self, input_dir: Path, logger: logging.Logger):
        self.input_dir = input_dir
        self.logger = logger
        self.results: List[Dict[str, Any]] = []
        self.summary: Dict[str, Any] = {}

    def discover_files(self) -> List[Path]:
        """Find all image files."""
        files = []
        for ext in SUPPORTED_EXTENSIONS:
            files.extend(self.input_dir.rglob(f"*{ext}"))
            files.extend(self.input_dir.rglob(f"*{ext.upper()}"))
        # Exclude sidecar files
        files = [f for f in files if not f.stem.endswith(("_label", "_metadata", "_mask"))]
        return sorted(set(files))

    def validate_all(self) -> Dict[str, Any]:
        """Validate all images in the dataset."""
        files = self.discover_files()
        self.logger.info("Found %d image files to validate in %s", len(files), self.input_dir)

        total = len(files)
        valid_count = 0
        invalid_count = 0
        warning_count = 0
        issue_counter: Dict[str, int] = collections.Counter()
        warning_counter: Dict[str, int] = collections.Counter()
        class_counts: Dict[str, int] = collections.Counter()
        format_counts: Dict[str, int] = collections.Counter()
        invalid_files: List[Dict] = []
        warning_files: List[Dict] = []

        for idx, filepath in enumerate(files, 1):
            if idx % 500 == 0:
                self.logger.info("  Validated %d/%d files...", idx, total)

            result = ImageValidator.validate(filepath)
            self.results.append(result)

            # Determine class label from directory structure
            rel = filepath.relative_to(self.input_dir)
            parts = rel.parts
            if len(parts) >= 2:
                label = parts[0] if parts[0] in CLASS_LABELS else (parts[1] if len(parts) > 1 and parts[1] in CLASS_LABELS else "unknown")
            else:
                label = "unknown"
            class_counts[label] += 1
            result["class_label"] = label

            format_counts[result["extension"]] += 1

            if result["valid"]:
                valid_count += 1
            else:
                invalid_count += 1
                for issue in result["issues"]:
                    issue_type = issue.split("(")[0].strip()
                    issue_counter[issue_type] += 1
                invalid_files.append({
                    "path": str(filepath),
                    "issues": result["issues"],
                })

            if result.get("warnings"):
                warning_count += 1
                for warn in result["warnings"]:
                    warn_type = warn.split("(")[0].strip()
                    warning_counter[warn_type] += 1
                warning_files.append({
                    "path": str(filepath),
                    "warnings": result["warnings"],
                })

        # Class imbalance check
        imbalance_warning = None
        if class_counts:
            counts = [c for c in class_counts.values() if c > 0]
            if counts and max(counts) / max(min(counts), 1) > IMBALANCE_RATIO_WARN:
                imbalance_warning = {
                    "type": "class_imbalance",
                    "max_class": max(class_counts, key=class_counts.get),
                    "min_class": min(class_counts, key=class_counts.get),
                    "ratio": round(max(counts) / max(min(counts), 1), 2),
                    "distribution": dict(class_counts),
                }

        # Label coverage check
        missing_labels = []
        for filepath in files:
            label_path = filepath.parent / f"{filepath.stem}_label.json"
            if not label_path.exists():
                # Check for directory-based labeling
                rel = filepath.relative_to(self.input_dir)
                if not any(p in CLASS_LABELS for p in rel.parts):
                    missing_labels.append(str(filepath))

        self.summary = {
            "validation_tool": "NER-SHIELD validate_dataset.py",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "input_dir": str(self.input_dir),
            "total_files": total,
            "valid_files": valid_count,
            "invalid_files": invalid_count,
            "files_with_warnings": warning_count,
            "validity_rate_pct": round(valid_count / total * 100, 2) if total > 0 else 0,
            "issue_breakdown": dict(issue_counter.most_common()),
            "warning_breakdown": dict(warning_counter.most_common()),
            "class_distribution": dict(sorted(class_counts.items())),
            "format_distribution": dict(sorted(format_counts.items())),
            "class_imbalance_warning": imbalance_warning,
            "missing_label_count": len(missing_labels),
            "invalid_file_list": invalid_files[:200],  # Limit to 200 entries
            "warning_file_list": warning_files[:200],
        }

        if missing_labels:
            self.summary["missing_labels_sample"] = missing_labels[:50]

        return self.summary

    def print_report(self):
        """Print a human-readable validation report."""
        s = self.summary

        self.logger.info("=" * 70)
        self.logger.info("NER-SHIELD DATASET VALIDATION REPORT")
        self.logger.info("=" * 70)
        self.logger.info("Input directory: %s", s["input_dir"])
        self.logger.info("Timestamp: %s", s["timestamp"])
        self.logger.info("")
        self.logger.info("OVERALL RESULTS")
        self.logger.info("-" * 40)
        self.logger.info("Total files:          %d", s["total_files"])
        self.logger.info("Valid files:          %d", s["valid_files"])
        self.logger.info("Invalid files:        %d", s["invalid_files"])
        self.logger.info("Files with warnings:  %d", s["files_with_warnings"])
        self.logger.info("Validity rate:        %.1f%%", s["validity_rate_pct"])
        self.logger.info("")

        if s["issue_breakdown"]:
            self.logger.info("ISSUES (causing invalidation)")
            self.logger.info("-" * 40)
            for issue, count in s["issue_breakdown"].items():
                self.logger.info("  %-30s %d", issue, count)
            self.logger.info("")

        if s["warning_breakdown"]:
            self.logger.info("WARNINGS (non-blocking)")
            self.logger.info("-" * 40)
            for warn, count in s["warning_breakdown"].items():
                self.logger.info("  %-30s %d", warn, count)
            self.logger.info("")

        self.logger.info("CLASS DISTRIBUTION")
        self.logger.info("-" * 40)
        for label, count in s["class_distribution"].items():
            pct = count / s["total_files"] * 100 if s["total_files"] > 0 else 0
            bar = "#" * int(pct / 2)
            self.logger.info("  %-25s %6d (%5.1f%%) %s", label, count, pct, bar)

        if s["class_imbalance_warning"]:
            ci = s["class_imbalance_warning"]
            self.logger.info("")
            self.logger.info("CLASS IMBALANCE WARNING")
            self.logger.info("  Largest class: %s", ci["max_class"])
            self.logger.info("  Smallest class: %s", ci["min_class"])
            self.logger.info("  Ratio: %.1fx", ci["ratio"])

        self.logger.info("")
        self.logger.info("FORMAT DISTRIBUTION")
        self.logger.info("-" * 40)
        for fmt, count in s["format_distribution"].items():
            self.logger.info("  %-10s %d", fmt, count)

        self.logger.info("")
        self.logger.info("Missing labels: %d", s["missing_label_count"])

        if s["invalid_files"] > 0:
            self.logger.info("")
            self.logger.info("INVALID FILES (first 20)")
            self.logger.info("-" * 40)
            for entry in s["invalid_file_list"][:20]:
                self.logger.info("  %s", entry["path"])
                for issue in entry["issues"]:
                    self.logger.info("    - %s", issue)

        self.logger.info("=" * 70)

        # Overall verdict
        if s["invalid_files"] == 0:
            self.logger.info("VERDICT: PASS — All files are valid.")
        elif s["validity_rate_pct"] >= 95:
            self.logger.info("VERDICT: PASS WITH WARNINGS — %.1f%% valid. "
                             "Review %d invalid files.",
                             s["validity_rate_pct"], s["invalid_files"])
        else:
            self.logger.info("VERDICT: NEEDS ATTENTION — %.1f%% valid. "
                             "%d invalid files require review.",
                             s["validity_rate_pct"], s["invalid_files"])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Validate dataset for quality issues",
    )
    parser.add_argument("--input-dir", type=str, required=True,
                        help="Directory containing the dataset to validate")
    parser.add_argument("--output-report", type=str, default=None,
                        help="Path for JSON validation report (default: <input-dir>/validation_report.json)")
    parser.add_argument("--verbose", action="store_true",
                        help="Show per-file validation details")
    return parser.parse_args()


def main():
    args = parse_args()
    input_dir = Path(args.input_dir).resolve()

    if not input_dir.exists():
        print(f"Error: Input directory does not exist: {input_dir}", file=sys.stderr)
        sys.exit(1)

    report_path = Path(args.output_report) if args.output_report else input_dir / "validation_report.json"
    logger = setup_logging(report_path.parent)

    logger.info("NER-SHIELD Dataset Validator starting")
    logger.info("Input: %s", input_dir)

    validator = DatasetValidator(input_dir, logger)
    start_time = time.time()
    summary = validator.validate_all()
    elapsed = time.time() - start_time

    summary["validation_time_seconds"] = round(elapsed, 2)

    validator.print_report()

    # Save JSON report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)
    logger.info("JSON report saved to %s", report_path)

    logger.info("Validation completed in %.1f seconds.", elapsed)

    # Exit with non-zero if too many invalid files
    if summary["validity_rate_pct"] < 90:
        sys.exit(1)


if __name__ == "__main__":
    main()
