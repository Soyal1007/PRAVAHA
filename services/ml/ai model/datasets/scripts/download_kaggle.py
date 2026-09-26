#!/usr/bin/env python3
"""
NER-SHIELD: Kaggle Datasets Downloader
Downloads all required Kaggle datasets using the kaggle CLI API.

Targets: NASA Global Landslide Catalog, Landslide4Sense, Bijie Landslide,
Sen1Floods11, FloodNet, Road Damage Detection, xBD, CrisisMMD, AIDER,
EuroSAT, UC Merced, BigEarthNet, RESISC-45, PatternNet

Usage:
    python download_kaggle.py --output-dir ./raw/kaggle
    python download_kaggle.py --output-dir ./raw/kaggle --datasets nasa-landslide eurosat
"""

import argparse
import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Complete catalog of Kaggle datasets required for NER-SHIELD
KAGGLE_DATASETS = {
    "nasa-landslide": {
        "name": "NASA Global Landslide Catalog",
        "slug": "nasa/global-landslide-catalog",
        "type": "dataset",
        "description": "Historical global landslide event locations for training Risk Engine",
        "relevance": "Historical landslide locations, filter for NER bounding box",
        "license": "CC0 Public Domain",
        "expected_format": "CSV",
    },
    "landslide4sense": {
        "name": "Landslide4Sense",
        "slug": "humansintheloop/landslide4sense",
        "type": "dataset",
        "description": "Multi-source satellite imagery for global landslide detection",
        "relevance": "Pre-labeled landslide imagery for transfer learning",
        "license": "CC BY-NC-SA 4.0",
        "expected_format": "GeoTIFF",
    },
    "bijie-landslide": {
        "name": "Bijie Landslide Dataset",
        "slug": "monikagrawal/bijie-landslide-dataset",
        "type": "dataset",
        "description": "Landslide detection satellite image dataset from Bijie, China",
        "relevance": "Landslide binary classification training data",
        "license": "CC BY 4.0",
        "expected_format": "PNG/JPG",
    },
    "sen1floods11": {
        "name": "Sen1Floods11",
        "slug": "deoxyribonucleid/sen1floods11",
        "type": "dataset",
        "description": "Sentinel-1 SAR and Sentinel-2 optical flood mapping dataset",
        "relevance": "Flood detection with SAR data, critical for monsoon monitoring",
        "license": "CC BY 4.0",
        "expected_format": "GeoTIFF",
    },
    "floodnet": {
        "name": "FloodNet",
        "slug": "smeschke/floodnet",
        "type": "dataset",
        "description": "High-resolution UAV imagery for flood scene understanding",
        "relevance": "Fine-grained flood damage classification",
        "license": "CC BY 4.0",
        "expected_format": "JPG/PNG",
    },
    "rdd2022": {
        "name": "Road Damage Detection 2022",
        "slug": "arnavr10880/road-damage-dataset-rdd2022",
        "type": "dataset",
        "description": "Road surface damage detection dataset with bounding boxes",
        "relevance": "Road damage classification for NER road infrastructure",
        "license": "CC BY-SA 4.0",
        "expected_format": "JPG + XML",
    },
    "xbd": {
        "name": "xBD (xView2 Building Damage)",
        "slug": "upen210995/xview2-xbd",
        "type": "dataset",
        "description": "Building damage assessment from satellite imagery (pre/post disaster)",
        "relevance": "Before/after disaster pairs with damage labels",
        "license": "CC BY-NC-SA 4.0",
        "expected_format": "PNG + JSON",
    },
    "crisismd": {
        "name": "CrisisMMD",
        "slug": "mloey/crisismmd-multimodal-crisis-dataset",
        "type": "dataset",
        "description": "Multimodal dataset for humanitarian crisis event detection",
        "relevance": "Crisis event classification across modalities",
        "license": "CC BY-NC 4.0",
        "expected_format": "JPG + TSV",
    },
    "aider": {
        "name": "AIDER (Aerial Image Dataset for Emergency Response)",
        "slug": "surajkamble/aider-v2-aerial-image-dataset",
        "type": "dataset",
        "description": "Aerial images classified by disaster type",
        "relevance": "Multi-class disaster classification from aerial views",
        "license": "CC BY 4.0",
        "expected_format": "JPG",
    },
    "eurosat": {
        "name": "EuroSAT",
        "slug": "apollo2506/eurosat-dataset",
        "type": "dataset",
        "description": "Sentinel-2 satellite image classification (10 LULC classes)",
        "relevance": "Land use/land cover baseline for pre-training",
        "license": "MIT",
        "expected_format": "GeoTIFF/JPG",
    },
    "ucmerced": {
        "name": "UC Merced Land Use",
        "slug": "apollo2506/uc-merced-land-use-dataset",
        "type": "dataset",
        "description": "21-class aerial scene classification dataset",
        "relevance": "Scene classification pre-training for overhead imagery",
        "license": "Public Domain",
        "expected_format": "TIF",
    },
    "bigearthnet": {
        "name": "BigEarthNet",
        "slug": "apollo2506/bigearthnet",
        "type": "dataset",
        "description": "Large-scale Sentinel-2 multi-label land cover dataset",
        "relevance": "Large-scale pre-training for Sentinel-2 feature extraction",
        "license": "CC BY-SA 3.0",
        "expected_format": "GeoTIFF",
    },
    "resisc45": {
        "name": "NWPU-RESISC45",
        "slug": "nitishabharathi/nwpu-resisc45",
        "type": "dataset",
        "description": "45-class remote sensing image scene classification",
        "relevance": "Diverse scene classification for backbone pre-training",
        "license": "Research Use",
        "expected_format": "JPG",
    },
    "patternnet": {
        "name": "PatternNet",
        "slug": "apollo2506/patternnet",
        "type": "dataset",
        "description": "38-class high-resolution remote sensing image dataset",
        "relevance": "Pattern recognition in satellite imagery",
        "license": "Research Use",
        "expected_format": "JPG/TIF",
    },
}

# Alternative slugs to try if primary slug fails
ALTERNATIVE_SLUGS = {
    "landslide4sense": [
        "lantian0802/landslide4sense",
        "masonhuang/landslide4sense",
    ],
    "sen1floods11": [
        "ywang311/sen1floods11",
        "bencecsurak/sen1floods11-dataset",
    ],
    "floodnet": [
        "atharvaingle/floodnet-challenge-2021",
        "vbookshelf/floodnet-2021",
    ],
    "bijie-landslide": [
        "gvnberern/bijie-landslide-dataset",
    ],
    "xbd": [
        "cosmicad/xbd",
    ],
    "bigearthnet": [
        "thedatasith/bigearthnet",
    ],
}


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"download_kaggle_{timestamp}.log"

    logger = logging.getLogger("download_kaggle")
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
# Kaggle API helpers
# ---------------------------------------------------------------------------

def check_kaggle_api(logger: logging.Logger) -> bool:
    """Verify kaggle CLI is installed and configured."""
    try:
        result = subprocess.run(
            ["kaggle", "--version"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            logger.info("Kaggle CLI: %s", result.stdout.strip())
            return True
        else:
            logger.error("Kaggle CLI error: %s", result.stderr.strip())
            return False
    except FileNotFoundError:
        logger.error(
            "Kaggle CLI not found. Install with: pip install kaggle\n"
            "Then configure: place kaggle.json in ~/.kaggle/ or set "
            "KAGGLE_USERNAME and KAGGLE_KEY environment variables."
        )
        return False
    except subprocess.TimeoutExpired:
        logger.error("Kaggle CLI timed out.")
        return False


def check_kaggle_auth(logger: logging.Logger) -> bool:
    """Verify Kaggle authentication is configured."""
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    has_env = bool(os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"))
    has_file = kaggle_json.exists()

    if has_env:
        logger.info("Kaggle auth: using environment variables")
        return True
    elif has_file:
        logger.info("Kaggle auth: using %s", kaggle_json)
        # Ensure correct permissions
        try:
            kaggle_json.chmod(0o600)
        except OSError:
            pass
        return True
    else:
        logger.error(
            "Kaggle authentication not configured.\n"
            "Option 1: Set KAGGLE_USERNAME and KAGGLE_KEY environment variables.\n"
            "Option 2: Download kaggle.json from https://www.kaggle.com/settings "
            "and place in ~/.kaggle/"
        )
        return False


def compute_dir_size(directory: Path) -> int:
    """Compute total size of all files in a directory."""
    total = 0
    for f in directory.rglob("*"):
        if f.is_file():
            total += f.stat().st_size
    return total


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download_kaggle_dataset(
    dataset_key: str,
    config: Dict[str, Any],
    output_dir: Path,
    logger: logging.Logger,
    force: bool = False,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """Download and extract a single Kaggle dataset."""
    slug = config["slug"]
    ds_name = config["name"]
    ds_dir = output_dir / dataset_key
    ds_dir.mkdir(parents=True, exist_ok=True)

    # Check if already downloaded
    if not force and ds_dir.exists() and any(ds_dir.iterdir()):
        existing_size = compute_dir_size(ds_dir)
        if existing_size > 1024:  # More than 1KB of content
            logger.info("Dataset '%s' already exists at %s (%.2f MB). Skipping. Use --force to re-download.",
                        ds_name, ds_dir, existing_size / 1024 / 1024)
            return {
                "status": "skipped",
                "dataset": dataset_key,
                "name": ds_name,
                "slug": slug,
                "directory": str(ds_dir),
                "size_bytes": existing_size,
                "reason": "already_downloaded",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    # Try primary slug and alternatives
    slugs_to_try = [slug] + ALTERNATIVE_SLUGS.get(dataset_key, [])

    for attempt_slug in slugs_to_try:
        for attempt in range(1, max_retries + 1):
            logger.info("Downloading '%s' from kaggle (slug: %s, attempt %d/%d)",
                        ds_name, attempt_slug, attempt, max_retries)

            cmd = [
                "kaggle", "datasets", "download",
                "-d", attempt_slug,
                "-p", str(ds_dir),
                "--unzip",
            ]

            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=3600,  # 1 hour timeout for large datasets
                    env={**os.environ, "KAGGLE_CONFIG_DIR": str(Path.home() / ".kaggle")},
                )

                if result.returncode == 0:
                    total_size = compute_dir_size(ds_dir)
                    file_count = sum(1 for f in ds_dir.rglob("*") if f.is_file())
                    logger.info(
                        "Successfully downloaded '%s': %d files, %.2f MB",
                        ds_name, file_count, total_size / 1024 / 1024,
                    )

                    # Clean up zip files if unzip left them
                    for zf in ds_dir.glob("*.zip"):
                        try:
                            zf.unlink()
                            logger.debug("Cleaned up zip file: %s", zf.name)
                        except OSError:
                            pass

                    return {
                        "status": "success",
                        "dataset": dataset_key,
                        "name": ds_name,
                        "slug": attempt_slug,
                        "directory": str(ds_dir),
                        "file_count": file_count,
                        "size_bytes": total_size,
                        "license": config.get("license", "Unknown"),
                        "download_timestamp": datetime.now(timezone.utc).isoformat(),
                    }

                else:
                    stderr = result.stderr.strip()
                    logger.warning("Download attempt %d failed for '%s': %s",
                                   attempt, ds_name, stderr)

                    # If 403/404, try next slug
                    if "403" in stderr or "404" in stderr or "not found" in stderr.lower():
                        logger.info("Dataset slug '%s' not accessible, trying alternative.",
                                    attempt_slug)
                        break

                    # Retry on transient errors
                    if attempt < max_retries:
                        wait = 2 ** attempt * 5
                        logger.info("Retrying in %d seconds...", wait)
                        time.sleep(wait)

            except subprocess.TimeoutExpired:
                logger.error("Download timed out for '%s' (attempt %d)", ds_name, attempt)
                if attempt < max_retries:
                    time.sleep(10)
            except Exception as exc:
                logger.error("Unexpected error downloading '%s': %s", ds_name, exc)
                if attempt < max_retries:
                    time.sleep(5)

    # All attempts failed
    logger.error("Failed to download '%s' after trying all slugs.", ds_name)
    return {
        "status": "failed",
        "dataset": dataset_key,
        "name": ds_name,
        "slug": slug,
        "directory": str(ds_dir),
        "error": "All download attempts failed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def download_kaggle_competition(
    dataset_key: str,
    config: Dict[str, Any],
    output_dir: Path,
    logger: logging.Logger,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """Download a Kaggle competition dataset (requires accepting rules)."""
    slug = config["slug"]
    ds_name = config["name"]
    ds_dir = output_dir / dataset_key
    ds_dir.mkdir(parents=True, exist_ok=True)

    for attempt in range(1, max_retries + 1):
        logger.info("Downloading competition '%s' (attempt %d/%d)",
                     ds_name, attempt, max_retries)

        # First, accept competition rules
        accept_cmd = ["kaggle", "competitions", "rules", "-c", slug, "--accept"]
        try:
            subprocess.run(accept_cmd, capture_output=True, text=True, timeout=30)
        except (subprocess.TimeoutExpired, Exception):
            pass

        cmd = [
            "kaggle", "competitions", "download",
            "-c", slug,
            "-p", str(ds_dir),
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            if result.returncode == 0:
                # Extract any zip files
                for zf_path in ds_dir.glob("*.zip"):
                    try:
                        with zipfile.ZipFile(zf_path, "r") as zf:
                            zf.extractall(ds_dir)
                        zf_path.unlink()
                    except (zipfile.BadZipFile, OSError) as exc:
                        logger.warning("Could not extract %s: %s", zf_path, exc)

                total_size = compute_dir_size(ds_dir)
                file_count = sum(1 for f in ds_dir.rglob("*") if f.is_file())
                logger.info("Successfully downloaded competition '%s': %d files, %.2f MB",
                            ds_name, file_count, total_size / 1024 / 1024)
                return {
                    "status": "success",
                    "dataset": dataset_key,
                    "name": ds_name,
                    "slug": slug,
                    "type": "competition",
                    "directory": str(ds_dir),
                    "file_count": file_count,
                    "size_bytes": total_size,
                    "download_timestamp": datetime.now(timezone.utc).isoformat(),
                }
            else:
                logger.warning("Competition download failed: %s", result.stderr.strip())
                if attempt < max_retries:
                    time.sleep(2 ** attempt * 5)
        except subprocess.TimeoutExpired:
            logger.error("Competition download timed out.")
        except Exception as exc:
            logger.error("Error downloading competition: %s", exc)

    return {
        "status": "failed",
        "dataset": dataset_key,
        "name": ds_name,
        "slug": slug,
        "error": "All attempts failed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------

def organize_dataset(
    dataset_key: str,
    config: Dict[str, Any],
    ds_dir: Path,
    logger: logging.Logger,
):
    """Organize downloaded dataset into a standard structure."""
    # Create a metadata file for each dataset
    meta = {
        "dataset_id": dataset_key,
        "name": config["name"],
        "slug": config["slug"],
        "description": config["description"],
        "relevance": config.get("relevance", ""),
        "license": config.get("license", "Unknown"),
        "expected_format": config.get("expected_format", ""),
        "download_date": datetime.now(timezone.utc).isoformat(),
        "file_count": sum(1 for f in ds_dir.rglob("*") if f.is_file()),
        "total_size_bytes": compute_dir_size(ds_dir),
    }

    # File inventory
    files = []
    for f in sorted(ds_dir.rglob("*")):
        if f.is_file() and f.name != "_metadata.json":
            files.append({
                "path": str(f.relative_to(ds_dir)),
                "size_bytes": f.stat().st_size,
                "extension": f.suffix.lower(),
            })
    meta["files"] = files

    meta_file = ds_dir / "_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    logger.debug("Wrote metadata for %s", dataset_key)


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(results: List[Dict[str, Any]], output_dir: Path, logger: logging.Logger):
    manifest = {
        "source": "Kaggle",
        "download_tool": "NER-SHIELD download_kaggle.py",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_datasets": len(results),
        "successful": sum(1 for r in results if r.get("status") == "success"),
        "skipped": sum(1 for r in results if r.get("status") == "skipped"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
        "total_size_bytes": sum(r.get("size_bytes", 0) for r in results),
        "datasets": results,
    }

    manifest_path = output_dir / "kaggle_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    logger.info("=" * 60)
    logger.info("KAGGLE DOWNLOAD SUMMARY")
    logger.info("Total datasets: %d", manifest["total_datasets"])
    logger.info("Successful:     %d", manifest["successful"])
    logger.info("Skipped:        %d", manifest["skipped"])
    logger.info("Failed:         %d", manifest["failed"])
    total_gb = manifest["total_size_bytes"] / 1024 / 1024 / 1024
    logger.info("Total size:     %.2f GB", total_gb)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Download Kaggle datasets for satellite image analysis",
    )
    parser.add_argument("--output-dir", type=str, default="./raw/kaggle",
                        help="Output directory (default: ./raw/kaggle)")
    parser.add_argument("--datasets", nargs="+",
                        choices=list(KAGGLE_DATASETS.keys()) + ["all"],
                        default=["all"],
                        help="Datasets to download (default: all)")
    parser.add_argument("--force", action="store_true",
                        help="Force re-download of already downloaded datasets")
    parser.add_argument("--max-retries", type=int, default=3,
                        help="Max download retry attempts (default: 3)")
    parser.add_argument("--dry-run", action="store_true",
                        help="List datasets without downloading")
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD Kaggle Dataset Downloader starting")
    logger.info("Output: %s", output_dir)

    # Determine which datasets to download
    if "all" in args.datasets:
        target_datasets = list(KAGGLE_DATASETS.keys())
    else:
        target_datasets = args.datasets

    logger.info("Target datasets: %s", ", ".join(target_datasets))

    if args.dry_run:
        logger.info("DRY RUN MODE")
        for key in target_datasets:
            cfg = KAGGLE_DATASETS[key]
            logger.info("  [%s] %s — %s", key, cfg["name"], cfg["slug"])
        return

    # Verify kaggle CLI and auth
    if not check_kaggle_api(logger):
        logger.error("Kaggle CLI not available. Exiting.")
        sys.exit(1)
    if not check_kaggle_auth(logger):
        logger.error("Kaggle authentication not configured. Exiting.")
        sys.exit(1)

    all_results: List[Dict[str, Any]] = []

    for idx, ds_key in enumerate(target_datasets, 1):
        config = KAGGLE_DATASETS[ds_key]
        logger.info("-" * 60)
        logger.info("[%d/%d] %s", idx, len(target_datasets), config["name"])
        logger.info("  Slug: %s", config["slug"])
        logger.info("  Relevance: %s", config.get("relevance", ""))

        if config.get("type") == "competition":
            result = download_kaggle_competition(
                ds_key, config, output_dir, logger, args.max_retries,
            )
        else:
            result = download_kaggle_dataset(
                ds_key, config, output_dir, logger, args.force, args.max_retries,
            )

        all_results.append(result)

        # Organize if successful
        ds_dir = output_dir / ds_key
        if result.get("status") == "success" and ds_dir.exists():
            organize_dataset(ds_key, config, ds_dir, logger)

        # Rate limiting between downloads
        if idx < len(target_datasets):
            time.sleep(3)

    write_manifest(all_results, output_dir, logger)
    logger.info("Kaggle download complete.")


if __name__ == "__main__":
    main()
