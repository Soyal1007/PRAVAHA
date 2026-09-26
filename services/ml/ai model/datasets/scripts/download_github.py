#!/usr/bin/env python3
"""
NER-SHIELD: GitHub Datasets / Repositories Cloner
Clones relevant geospatial / remote-sensing repositories with --depth 1
and extracts only dataset portions where applicable.

Targets: torchgeo, Landslide-Detection, SpaceNet, DOTA, iSAID, LoveDA,
         WHU Building, LEVIR-CD, DSIFN-CD, S2Looking, CDD

Usage:
    python download_github.py --output-dir ./raw/github
    python download_github.py --output-dir ./raw/github --repos torchgeo loveda
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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GITHUB_REPOS = {
    "torchgeo": {
        "name": "TorchGeo",
        "url": "https://github.com/microsoft/torchgeo.git",
        "description": "PyTorch library for geospatial data; includes dataset loaders "
                       "for dozens of remote-sensing benchmarks",
        "relevance": "Dataset loaders and utilities for satellite imagery ML pipelines",
        "license": "MIT",
        "extract_paths": [
            "torchgeo/datasets/",
            "torchgeo/datamodules/",
            "docs/api/datasets.rst",
            "conf/",
        ],
        "keep_full": False,
    },
    "landslide-detection": {
        "name": "Landslide Detection",
        "url": "https://github.com/ipradhan-usgs/Landslide-Detection.git",
        "description": "USGS landslide detection from satellite imagery using deep learning",
        "relevance": "Reference implementation for landslide detection models",
        "license": "Public Domain",
        "extract_paths": ["data/", "models/", "notebooks/"],
        "keep_full": False,
        "alternatives": [
            "https://github.com/sachink1729/Landslide-Detection.git",
            "https://github.com/KhushiAgrawal22/Landslide-Detection.git",
        ],
    },
    "spacenet": {
        "name": "SpaceNet Utilities",
        "url": "https://github.com/SpaceNetChallenge/SpaceNet_SAR_Buildings_Solutions.git",
        "description": "SpaceNet challenge SAR building detection solutions",
        "relevance": "SAR-based building detection, applicable to infrastructure damage",
        "license": "Apache 2.0",
        "extract_paths": ["data/", "models/", "src/"],
        "keep_full": False,
        "alternatives": [
            "https://github.com/SpaceNetChallenge/SpaceNet_Off_Nadir_Solutions.git",
        ],
    },
    "dota": {
        "name": "DOTA (Detection of Objects in Aerial Images)",
        "url": "https://github.com/CAPTAIN-WHU/DOTA_devkit.git",
        "description": "Development kit for DOTA dataset — oriented object detection in aerials",
        "relevance": "Object detection in aerial/satellite imagery",
        "license": "GPL-3.0",
        "extract_paths": ["dota_devkit/", "dota-v1.5/", "dota-v2.0/"],
        "keep_full": True,
    },
    "isaid": {
        "name": "iSAID (Instance Segmentation in Aerial Images Dataset)",
        "url": "https://github.com/CAPTAIN-WHU/iSAID_Devkit.git",
        "description": "Instance segmentation toolkit for aerial images",
        "relevance": "Fine-grained segmentation of objects in overhead imagery",
        "license": "Research Use",
        "extract_paths": [],
        "keep_full": True,
    },
    "loveda": {
        "name": "LoveDA",
        "url": "https://github.com/Junjue-Wang/LoveDA.git",
        "description": "Land-cover classification from high-resolution remote sensing",
        "relevance": "Domain-adaptive land cover segmentation",
        "license": "CC BY-NC-SA 4.0",
        "extract_paths": ["data_sample/", "utils/"],
        "keep_full": True,
    },
    "whu-building": {
        "name": "WHU Building Dataset",
        "url": "https://github.com/SarahwXU/WHU-Building.git",
        "description": "Large-scale building extraction from aerial imagery",
        "relevance": "Building footprint extraction for infrastructure mapping",
        "license": "Research Use",
        "extract_paths": [],
        "keep_full": True,
        "alternatives": [
            "https://github.com/jinikeda/whu-building.git",
        ],
    },
    "levir-cd": {
        "name": "LEVIR-CD (Change Detection)",
        "url": "https://github.com/justchenhao/STANet.git",
        "description": "Siamese network for remote sensing change detection (LEVIR-CD dataset)",
        "relevance": "Before/after change detection — core capability for NER-SHIELD",
        "license": "MIT",
        "extract_paths": ["dataset/", "models/", "data/"],
        "keep_full": False,
    },
    "dsifn-cd": {
        "name": "DSIFN-CD (Deeply Supervised Image Fusion Network for Change Detection)",
        "url": "https://github.com/GeoZcx/A-deeply-supervised-image-fusion-network-for-change-detection-in-high-resolution-bi-temporal-remote-sensing-images.git",
        "description": "Deep image fusion for bi-temporal change detection",
        "relevance": "High-resolution change detection methodology",
        "license": "MIT",
        "extract_paths": ["dataset/", "data/"],
        "keep_full": False,
        "alternatives": [
            "https://github.com/OMEGA-RS/DSIFN-CD.git",
        ],
    },
    "s2looking": {
        "name": "S2Looking",
        "url": "https://github.com/S2Looking/S2Looking.git",
        "description": "Side-looking satellite imagery for building change detection",
        "relevance": "Building change detection with varied viewing angles",
        "license": "CC BY-NC-SA 4.0",
        "extract_paths": [],
        "keep_full": True,
        "alternatives": [
            "https://github.com/AnonymousForACMMM/S2Looking.git",
        ],
    },
    "cdd": {
        "name": "CDD (Change Detection Dataset)",
        "url": "https://github.com/ServiceNow/seasonal-contrast.git",
        "description": "Seasonal contrast change detection dataset and methods",
        "relevance": "Seasonal-aware change detection for NER monsoon cycles",
        "license": "Apache 2.0",
        "extract_paths": ["data/", "datasets/"],
        "keep_full": False,
        "alternatives": [
            "https://github.com/wgcban/ChangeFormer.git",
        ],
    },
}


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"download_github_{timestamp}.log"

    logger = logging.getLogger("download_github")
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
# Git helpers
# ---------------------------------------------------------------------------

def check_git(logger: logging.Logger) -> bool:
    """Verify git is installed."""
    try:
        result = subprocess.run(
            ["git", "--version"], capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            logger.info("Git: %s", result.stdout.strip())
            return True
    except FileNotFoundError:
        logger.error("Git not found. Install git to use this script.")
    return False


def compute_dir_size(directory: Path) -> int:
    total = 0
    for f in directory.rglob("*"):
        if f.is_file():
            total += f.stat().st_size
    return total


def clone_repo(
    url: str,
    dest: Path,
    logger: logging.Logger,
    depth: int = 1,
    max_retries: int = 3,
) -> bool:
    """Clone a git repository with shallow depth and retry logic."""
    for attempt in range(1, max_retries + 1):
        logger.info("  Cloning %s (attempt %d/%d)", url, attempt, max_retries)
        cmd = [
            "git", "clone",
            "--depth", str(depth),
            "--single-branch",
            url,
            str(dest),
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,  # 10 min timeout
            )
            if result.returncode == 0:
                logger.info("  Clone successful: %s", dest.name)
                return True
            else:
                stderr = result.stderr.strip()
                logger.warning("  Clone failed: %s", stderr)

                # If repo not found, don't retry
                if "not found" in stderr.lower() or "does not exist" in stderr.lower():
                    return False

                if attempt < max_retries:
                    wait = 2 ** attempt * 3
                    logger.info("  Retrying in %d seconds...", wait)
                    time.sleep(wait)

        except subprocess.TimeoutExpired:
            logger.error("  Clone timed out for %s", url)
            # Clean up partial clone
            if dest.exists():
                shutil.rmtree(dest, ignore_errors=True)
            if attempt < max_retries:
                time.sleep(5)

        except Exception as exc:
            logger.error("  Unexpected error cloning: %s", exc)
            if dest.exists():
                shutil.rmtree(dest, ignore_errors=True)

    return False


def extract_dataset_portions(
    repo_dir: Path,
    extract_paths: List[str],
    output_dir: Path,
    logger: logging.Logger,
) -> int:
    """
    Extract only dataset-relevant portions from a cloned repo.
    Returns number of files extracted.
    """
    extracted_count = 0

    for rel_path in extract_paths:
        src = repo_dir / rel_path
        if not src.exists():
            logger.debug("  Extract path not found: %s", rel_path)
            continue

        dst = output_dir / rel_path
        dst.parent.mkdir(parents=True, exist_ok=True)

        if src.is_dir():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst, dirs_exist_ok=True)
            count = sum(1 for f in dst.rglob("*") if f.is_file())
            extracted_count += count
            logger.info("  Extracted directory %s (%d files)", rel_path, count)
        elif src.is_file():
            shutil.copy2(src, dst)
            extracted_count += 1
            logger.info("  Extracted file %s", rel_path)

    return extracted_count


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download_repo(
    repo_key: str,
    config: Dict[str, Any],
    output_dir: Path,
    logger: logging.Logger,
    force: bool = False,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """Clone a repository and extract dataset portions."""
    repo_name = config["name"]
    repo_dir = output_dir / repo_key
    extract_dir = output_dir / f"{repo_key}_data"

    # Check if already cloned
    if not force and extract_dir.exists() and any(extract_dir.rglob("*")):
        existing_size = compute_dir_size(extract_dir)
        if existing_size > 512:
            logger.info("Repository '%s' data already exists at %s. Skipping.",
                        repo_name, extract_dir)
            return {
                "status": "skipped",
                "repo": repo_key,
                "name": repo_name,
                "directory": str(extract_dir),
                "size_bytes": existing_size,
                "reason": "already_exists",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    # Try primary URL and alternatives
    urls_to_try = [config["url"]] + config.get("alternatives", [])
    cloned = False
    used_url = ""

    for url in urls_to_try:
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)

        if clone_repo(url, repo_dir, logger, depth=1, max_retries=max_retries):
            cloned = True
            used_url = url
            break
        else:
            logger.info("  Primary URL failed, trying alternative...")

    if not cloned:
        logger.error("Failed to clone '%s' from any URL.", repo_name)
        return {
            "status": "failed",
            "repo": repo_key,
            "name": repo_name,
            "urls_tried": urls_to_try,
            "error": "All clone attempts failed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # Extract dataset portions or keep full repo
    extract_paths = config.get("extract_paths", [])
    keep_full = config.get("keep_full", False)

    if keep_full or not extract_paths:
        # Keep the full repo (minus .git)
        git_dir = repo_dir / ".git"
        if git_dir.exists():
            shutil.rmtree(git_dir, ignore_errors=True)

        # Rename to _data directory
        if extract_dir.exists():
            shutil.rmtree(extract_dir, ignore_errors=True)
        repo_dir.rename(extract_dir)

        file_count = sum(1 for f in extract_dir.rglob("*") if f.is_file())
        total_size = compute_dir_size(extract_dir)
        logger.info("  Kept full repo '%s': %d files, %.2f MB",
                     repo_name, file_count, total_size / 1024 / 1024)
    else:
        # Extract only dataset portions
        extract_dir.mkdir(parents=True, exist_ok=True)
        extracted = extract_dataset_portions(repo_dir, extract_paths, extract_dir, logger)

        # Also copy README and LICENSE
        for meta_file in ["README.md", "README.rst", "LICENSE", "LICENSE.md"]:
            src = repo_dir / meta_file
            if src.exists():
                shutil.copy2(src, extract_dir / meta_file)

        # Remove the full clone
        shutil.rmtree(repo_dir, ignore_errors=True)

        file_count = sum(1 for f in extract_dir.rglob("*") if f.is_file())
        total_size = compute_dir_size(extract_dir)
        logger.info("  Extracted %d files from '%s': %.2f MB",
                     file_count, repo_name, total_size / 1024 / 1024)

    return {
        "status": "success",
        "repo": repo_key,
        "name": repo_name,
        "url": used_url,
        "directory": str(extract_dir),
        "file_count": file_count,
        "size_bytes": total_size,
        "license": config.get("license", "Unknown"),
        "keep_full": keep_full,
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(results: List[Dict[str, Any]], output_dir: Path, logger: logging.Logger):
    manifest = {
        "source": "GitHub",
        "download_tool": "NER-SHIELD download_github.py",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_repos": len(results),
        "successful": sum(1 for r in results if r.get("status") == "success"),
        "skipped": sum(1 for r in results if r.get("status") == "skipped"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
        "total_size_bytes": sum(r.get("size_bytes", 0) for r in results),
        "repositories": results,
    }

    manifest_path = output_dir / "github_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    logger.info("=" * 60)
    logger.info("GITHUB CLONE SUMMARY")
    logger.info("Total repos:  %d", manifest["total_repos"])
    logger.info("Successful:   %d", manifest["successful"])
    logger.info("Skipped:      %d", manifest["skipped"])
    logger.info("Failed:       %d", manifest["failed"])
    total_mb = manifest["total_size_bytes"] / 1024 / 1024
    logger.info("Total size:   %.2f MB", total_mb)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Clone GitHub repos/datasets for satellite image analysis",
    )
    parser.add_argument("--output-dir", type=str, default="./raw/github",
                        help="Output directory (default: ./raw/github)")
    parser.add_argument("--repos", nargs="+",
                        choices=list(GITHUB_REPOS.keys()) + ["all"],
                        default=["all"],
                        help="Repositories to clone (default: all)")
    parser.add_argument("--force", action="store_true",
                        help="Force re-clone of already downloaded repos")
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD GitHub Repository Cloner starting")
    logger.info("Output: %s", output_dir)

    target_repos = list(GITHUB_REPOS.keys()) if "all" in args.repos else args.repos
    logger.info("Target repos: %s", ", ".join(target_repos))

    if args.dry_run:
        logger.info("DRY RUN MODE")
        for key in target_repos:
            cfg = GITHUB_REPOS[key]
            logger.info("  [%s] %s — %s", key, cfg["name"], cfg["url"])
            if cfg.get("extract_paths"):
                logger.info("    Extract: %s", ", ".join(cfg["extract_paths"]))
        return

    if not check_git(logger):
        sys.exit(1)

    all_results: List[Dict[str, Any]] = []

    for idx, repo_key in enumerate(target_repos, 1):
        config = GITHUB_REPOS[repo_key]
        logger.info("-" * 60)
        logger.info("[%d/%d] %s", idx, len(target_repos), config["name"])
        logger.info("  URL: %s", config["url"])

        result = download_repo(
            repo_key, config, output_dir, logger, args.force, args.max_retries,
        )
        all_results.append(result)

        if idx < len(target_repos):
            time.sleep(2)

    write_manifest(all_results, output_dir, logger)
    logger.info("GitHub clone complete.")


if __name__ == "__main__":
    main()
