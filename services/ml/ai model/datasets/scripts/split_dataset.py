#!/usr/bin/env python3
"""
NER-SHIELD: Stratified Dataset Splitter
Splits processed dataset into 70/15/15 train/val/test splits with:
  - Stratified sampling by class label
  - Geographic-aware splitting: same area never in train AND test
  - Before/after pairs kept together in the same split
  - Detailed split statistics output

Usage:
    python split_dataset.py --input-dir ./processed --output-dir ./processed
    python split_dataset.py --input-dir ./processed --output-dir ./processed --ratios 0.8 0.1 0.1
"""

import argparse
import collections
import hashlib
import json
import logging
import os
import random
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CLASS_LABELS = ["normal", "landslide", "flood", "road_damage",
                "infrastructure_damage", "terrain_change"]

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}

DEFAULT_RATIOS = (0.70, 0.15, 0.15)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"split_dataset_{timestamp}.log"

    logger = logging.getLogger("split_dataset")
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
# Data structures
# ---------------------------------------------------------------------------

class SampleRecord:
    """Represents a single image sample with metadata."""

    __slots__ = ("path", "label", "geo_group", "pair_group", "metadata")

    def __init__(
        self,
        path: Path,
        label: str,
        geo_group: Optional[str] = None,
        pair_group: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ):
        self.path = path
        self.label = label
        self.geo_group = geo_group    # Geographic area identifier
        self.pair_group = pair_group  # Before/after pair identifier
        self.metadata = metadata or {}


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

def load_sample_metadata(image_path: Path) -> Optional[Dict]:
    """Load sidecar label/metadata JSON for an image."""
    label_path = image_path.parent / f"{image_path.stem}_label.json"
    if label_path.exists():
        try:
            with open(label_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    meta_path = image_path.parent / f"{image_path.stem}_metadata.json"
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    return None


def infer_geo_group(image_path: Path, metadata: Optional[Dict]) -> str:
    """
    Infer a geographic group identifier for an image.
    Uses location info from metadata, or falls back to directory-based grouping.
    This ensures the same area never appears in both train and test.
    """
    if metadata:
        # If we have lat/lon, quantize to ~10km grid cells
        lat = metadata.get("lat") or metadata.get("location", {}).get("lat")
        lon = metadata.get("lon") or metadata.get("location", {}).get("lng")
        if lat is not None and lon is not None:
            lat_bin = round(float(lat), 1)  # ~11km grid
            lon_bin = round(float(lon), 1)
            return f"geo_{lat_bin}_{lon_bin}"

        # Use region/state if available
        region = metadata.get("region") or metadata.get("state")
        if region:
            return f"region_{region.lower().replace(' ', '_')}"

    # Fall back to source file directory as a proxy for geographic area
    # Group by the parent tile/scene identifier from the filename
    stem = image_path.stem
    # Extract common prefixes (e.g., "T46QEL_20230715" from Sentinel-2)
    parts = stem.split("_")
    if len(parts) >= 2:
        return f"file_{parts[0]}_{parts[1]}"

    return f"dir_{image_path.parent.name}"


def infer_pair_group(image_path: Path, metadata: Optional[Dict]) -> Optional[str]:
    """
    Infer pair grouping for before/after pairs.
    Before/after pairs must stay together in the same split.
    """
    if metadata:
        pair_id = metadata.get("pair_id")
        if pair_id:
            return pair_id

    stem = image_path.stem
    # Check for before/after naming patterns
    for pattern in ["_before", "_after", "_pre", "_post"]:
        if pattern in stem:
            return stem.replace(pattern, "")

    # Check parent directory for pair structure (e.g., BA-XXXXX/)
    parent_name = image_path.parent.name
    if parent_name.startswith("BA-"):
        return parent_name

    return None


def discover_samples(input_dir: Path, logger: logging.Logger) -> List[SampleRecord]:
    """Discover all image samples with labels and groupings."""
    samples = []

    # Look for images in class subdirectories
    for label_dir in sorted(input_dir.iterdir()):
        if not label_dir.is_dir():
            continue

        label = label_dir.name
        if label.startswith("_") or label.startswith(".") or label == "logs":
            continue

        for ext in SUPPORTED_EXTENSIONS:
            for image_path in label_dir.rglob(f"*{ext}"):
                if image_path.name.endswith("_label.json") or image_path.name.endswith("_metadata.json"):
                    continue

                metadata = load_sample_metadata(image_path)
                geo_group = infer_geo_group(image_path, metadata)
                pair_group = infer_pair_group(image_path, metadata)

                samples.append(SampleRecord(
                    path=image_path,
                    label=label,
                    geo_group=geo_group,
                    pair_group=pair_group,
                    metadata=metadata or {},
                ))

    # Also look for before_after_pairs directory
    pairs_dir = input_dir / "before_after_pairs"
    if pairs_dir.exists():
        for pair_dir in sorted(pairs_dir.iterdir()):
            if not pair_dir.is_dir():
                continue
            pair_id = pair_dir.name
            for ext in SUPPORTED_EXTENSIONS:
                for image_path in pair_dir.glob(f"*{ext}"):
                    metadata = load_sample_metadata(image_path)
                    geo_group = infer_geo_group(image_path, metadata)

                    label = "terrain_change"
                    if metadata:
                        event_type = metadata.get("event_type", "")
                        if event_type in CLASS_LABELS:
                            label = event_type

                    samples.append(SampleRecord(
                        path=image_path,
                        label=label,
                        geo_group=geo_group,
                        pair_group=pair_id,
                        metadata=metadata or {},
                    ))

    logger.info("Discovered %d samples", len(samples))
    return samples


# ---------------------------------------------------------------------------
# Splitting logic
# ---------------------------------------------------------------------------

def group_samples(samples: List[SampleRecord]) -> Dict[str, List[SampleRecord]]:
    """
    Group samples by their constraint groups (geo + pair).
    All samples in the same group must go to the same split.
    """
    groups: Dict[str, List[SampleRecord]] = {}

    for sample in samples:
        # Primary grouping: pair group takes precedence
        if sample.pair_group:
            key = f"pair:{sample.pair_group}"
        elif sample.geo_group:
            key = f"geo:{sample.geo_group}"
        else:
            # Individual sample - give unique group
            key = f"ind:{sample.path.stem}"

        if key not in groups:
            groups[key] = []
        groups[key].append(sample)

    return groups


def stratified_group_split(
    groups: Dict[str, List[SampleRecord]],
    ratios: Tuple[float, float, float],
    seed: int,
    logger: logging.Logger,
) -> Tuple[List[SampleRecord], List[SampleRecord], List[SampleRecord]]:
    """
    Split groups into train/val/test maintaining:
    1. Approximate stratification by class label
    2. No geographic leakage (whole groups stay together)
    3. Before/after pairs stay together
    """
    rng = random.Random(seed)

    # Organize groups by their dominant label
    label_groups: Dict[str, List[Tuple[str, List[SampleRecord]]]] = collections.defaultdict(list)

    for group_key, group_samples in groups.items():
        # Determine dominant label
        label_counts = collections.Counter(s.label for s in group_samples)
        dominant_label = label_counts.most_common(1)[0][0]
        label_groups[dominant_label].append((group_key, group_samples))

    train_samples = []
    val_samples = []
    test_samples = []

    train_ratio, val_ratio, test_ratio = ratios

    for label, label_group_list in sorted(label_groups.items()):
        # Shuffle groups within each label
        rng.shuffle(label_group_list)

        total_samples = sum(len(gs) for _, gs in label_group_list)
        target_train = int(total_samples * train_ratio)
        target_val = int(total_samples * val_ratio)

        train_count = 0
        val_count = 0
        test_count = 0

        for group_key, group_samples in label_group_list:
            n = len(group_samples)
            if train_count < target_train:
                train_samples.extend(group_samples)
                train_count += n
            elif val_count < target_val:
                val_samples.extend(group_samples)
                val_count += n
            else:
                test_samples.extend(group_samples)
                test_count += n

        logger.info("  Label %-25s train=%d, val=%d, test=%d (from %d groups)",
                     label, train_count, val_count, test_count, len(label_group_list))

    return train_samples, val_samples, test_samples


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def verify_no_leakage(
    train: List[SampleRecord],
    val: List[SampleRecord],
    test: List[SampleRecord],
    logger: logging.Logger,
) -> bool:
    """Verify no geographic or pair leakage between splits."""
    ok = True

    # Check geo groups
    train_geos = {s.geo_group for s in train if s.geo_group}
    val_geos = {s.geo_group for s in val if s.geo_group}
    test_geos = {s.geo_group for s in test if s.geo_group}

    train_test_overlap = train_geos & test_geos
    if train_test_overlap:
        logger.error("LEAKAGE: %d geo groups in both train and test: %s",
                      len(train_test_overlap), list(train_test_overlap)[:5])
        ok = False
    else:
        logger.info("  No geo-group leakage between train and test.")

    train_val_overlap = train_geos & val_geos
    val_test_overlap = val_geos & test_geos

    if train_val_overlap:
        logger.warning("  %d geo groups overlap between train and val", len(train_val_overlap))
    if val_test_overlap:
        logger.warning("  %d geo groups overlap between val and test", len(val_test_overlap))

    # Check pair groups
    train_pairs = {s.pair_group for s in train if s.pair_group}
    val_pairs = {s.pair_group for s in val if s.pair_group}
    test_pairs = {s.pair_group for s in test if s.pair_group}

    pair_leak_tv = train_pairs & val_pairs
    pair_leak_tt = train_pairs & test_pairs
    pair_leak_vt = val_pairs & test_pairs

    if pair_leak_tt:
        logger.error("LEAKAGE: %d pairs split across train and test: %s",
                      len(pair_leak_tt), list(pair_leak_tt)[:5])
        ok = False
    else:
        logger.info("  No pair leakage between train and test.")

    if pair_leak_tv:
        logger.warning("  %d pairs overlap between train and val", len(pair_leak_tv))
    if pair_leak_vt:
        logger.warning("  %d pairs overlap between val and test", len(pair_leak_vt))

    # Check file path uniqueness
    all_paths = [str(s.path) for s in train + val + test]
    if len(all_paths) != len(set(all_paths)):
        logger.error("DUPLICATE: Some files appear in multiple splits!")
        ok = False
    else:
        logger.info("  No duplicate files across splits.")

    return ok


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def copy_samples_to_split(
    samples: List[SampleRecord],
    split_name: str,
    output_dir: Path,
    logger: logging.Logger,
    symlink: bool = False,
):
    """Copy (or symlink) samples to the split output directory."""
    split_dir = output_dir / split_name

    for sample in samples:
        label_dir = split_dir / sample.label
        label_dir.mkdir(parents=True, exist_ok=True)

        dest = label_dir / sample.path.name

        if symlink:
            if dest.exists() or dest.is_symlink():
                dest.unlink()
            dest.symlink_to(sample.path.resolve())
        else:
            shutil.copy2(sample.path, dest)

        # Copy label sidecar if it exists
        label_json = sample.path.parent / f"{sample.path.stem}_label.json"
        if label_json.exists():
            shutil.copy2(label_json, label_dir / label_json.name)

    count = len(samples)
    logger.info("  Copied %d samples to %s/", count, split_name)


def compute_split_statistics(
    train: List[SampleRecord],
    val: List[SampleRecord],
    test: List[SampleRecord],
) -> Dict[str, Any]:
    """Compute detailed split statistics."""

    def split_stats(samples: List[SampleRecord], name: str) -> Dict:
        label_counts = collections.Counter(s.label for s in samples)
        geo_groups = len({s.geo_group for s in samples if s.geo_group})
        pair_groups = len({s.pair_group for s in samples if s.pair_group})
        return {
            "name": name,
            "total_samples": len(samples),
            "label_distribution": dict(sorted(label_counts.items())),
            "unique_geo_groups": geo_groups,
            "unique_pair_groups": pair_groups,
        }

    total = len(train) + len(val) + len(test)
    stats = {
        "total_samples": total,
        "train": split_stats(train, "train"),
        "val": split_stats(val, "val"),
        "test": split_stats(test, "test"),
        "split_ratios": {
            "train": round(len(train) / total, 4) if total > 0 else 0,
            "val": round(len(val) / total, 4) if total > 0 else 0,
            "test": round(len(test) / total, 4) if total > 0 else 0,
        },
    }

    # Per-class split ratios
    all_labels = sorted(set(s.label for s in train + val + test))
    per_class = {}
    for label in all_labels:
        tr = sum(1 for s in train if s.label == label)
        va = sum(1 for s in val if s.label == label)
        te = sum(1 for s in test if s.label == label)
        t = tr + va + te
        per_class[label] = {
            "total": t,
            "train": tr,
            "val": va,
            "test": te,
            "train_pct": round(tr / t * 100, 1) if t > 0 else 0,
            "val_pct": round(va / t * 100, 1) if t > 0 else 0,
            "test_pct": round(te / t * 100, 1) if t > 0 else 0,
        }
    stats["per_class"] = per_class

    return stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Stratified dataset splitter with geographic awareness",
    )
    parser.add_argument("--input-dir", type=str, required=True,
                        help="Input directory containing processed data in class subdirectories")
    parser.add_argument("--output-dir", type=str, required=True,
                        help="Output directory for train/val/test splits")
    parser.add_argument("--ratios", nargs=3, type=float, default=list(DEFAULT_RATIOS),
                        metavar=("TRAIN", "VAL", "TEST"),
                        help="Split ratios (default: 0.70 0.15 0.15)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed (default: 42)")
    parser.add_argument("--symlink", action="store_true",
                        help="Create symlinks instead of copying files")
    parser.add_argument("--dry-run", action="store_true",
                        help="Compute splits without copying files")
    return parser.parse_args()


def main():
    args = parse_args()
    input_dir = Path(args.input_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)

    ratios = tuple(args.ratios)
    assert abs(sum(ratios) - 1.0) < 1e-6, f"Ratios must sum to 1.0, got {sum(ratios)}"

    logger.info("NER-SHIELD Dataset Splitter starting")
    logger.info("Input:  %s", input_dir)
    logger.info("Output: %s", output_dir)
    logger.info("Ratios: train=%.2f, val=%.2f, test=%.2f", *ratios)
    logger.info("Seed:   %d", args.seed)

    # Discover samples
    samples = discover_samples(input_dir, logger)

    if not samples:
        logger.error("No samples found in %s", input_dir)
        return

    # Group samples
    groups = group_samples(samples)
    logger.info("Grouped into %d constraint groups", len(groups))

    # Split
    logger.info("-" * 60)
    logger.info("Performing stratified split...")
    train, val, test = stratified_group_split(groups, ratios, args.seed, logger)

    # Verify
    logger.info("-" * 60)
    logger.info("Verifying split integrity...")
    leakage_free = verify_no_leakage(train, val, test, logger)

    if not leakage_free:
        logger.error("DATA LEAKAGE DETECTED! Review the split.")

    # Statistics
    stats = compute_split_statistics(train, val, test)

    logger.info("-" * 60)
    logger.info("SPLIT STATISTICS")
    logger.info("Total samples: %d", stats["total_samples"])
    logger.info("  Train: %d (%.1f%%)", stats["train"]["total_samples"],
                stats["split_ratios"]["train"] * 100)
    logger.info("  Val:   %d (%.1f%%)", stats["val"]["total_samples"],
                stats["split_ratios"]["val"] * 100)
    logger.info("  Test:  %d (%.1f%%)", stats["test"]["total_samples"],
                stats["split_ratios"]["test"] * 100)
    logger.info("")
    logger.info("Per-class distribution:")
    logger.info("  %-25s %7s %7s %7s %7s", "Class", "Total", "Train", "Val", "Test")
    logger.info("  " + "-" * 55)
    for label, info in stats["per_class"].items():
        logger.info("  %-25s %7d %6d %6d %6d",
                     label, info["total"], info["train"], info["val"], info["test"])

    if args.dry_run:
        logger.info("DRY RUN — no files copied.")
    else:
        # Copy files
        logger.info("-" * 60)
        logger.info("Copying files to split directories...")
        copy_samples_to_split(train, "train", output_dir, logger, args.symlink)
        copy_samples_to_split(val, "val", output_dir, logger, args.symlink)
        copy_samples_to_split(test, "test", output_dir, logger, args.symlink)

    # Save statistics
    stats["timestamp"] = datetime.now(timezone.utc).isoformat()
    stats["input_dir"] = str(input_dir)
    stats["output_dir"] = str(output_dir)
    stats["seed"] = args.seed
    stats["leakage_free"] = leakage_free

    stats_path = output_dir / "split_statistics.json"
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    logger.info("Statistics written to %s", stats_path)

    logger.info("=" * 60)
    logger.info("Dataset split complete.")


if __name__ == "__main__":
    main()
