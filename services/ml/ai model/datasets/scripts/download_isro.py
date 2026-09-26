#!/usr/bin/env python3
"""
NER-SHIELD: ISRO Bhuvan Data Downloader
Downloads satellite imagery and geospatial datasets from ISRO Bhuvan Open Data Archive
for Northeast India region.

Targets: CartoDEM (10m/30m), LISS-III/IV, AWiFS, RISAT-1 SAR, Resourcesat-2/2A,
         Bhuvan Landslide Atlas, Bhuvan Flood Monitoring

Usage:
    python download_isro.py --output-dir ./raw/isro_bhuvan
    python download_isro.py --output-dir ./raw/isro_bhuvan --datasets cartodem liss3
    python download_isro.py --output-dir ./raw/isro_bhuvan --states Assam Meghalaya
"""

import argparse
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse, urlencode

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NER_BBOX = {"north": 29.0, "south": 21.0, "east": 98.0, "west": 88.0}

NER_STATES = [
    "Assam", "Meghalaya", "Manipur", "Mizoram",
    "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim",
]

# State-level approximate bounding boxes for more targeted downloads
STATE_BBOXES = {
    "Assam":              {"north": 27.97, "south": 24.13, "east": 96.02, "west": 89.70},
    "Meghalaya":          {"north": 26.12, "south": 25.03, "east": 92.80, "west": 89.81},
    "Manipur":            {"north": 25.69, "south": 23.83, "east": 94.74, "west": 93.03},
    "Mizoram":            {"north": 24.52, "south": 21.94, "east": 93.44, "west": 92.15},
    "Nagaland":           {"north": 27.05, "south": 25.20, "east": 95.24, "west": 93.34},
    "Tripura":            {"north": 24.53, "south": 22.94, "east": 92.33, "west": 91.15},
    "Arunachal Pradesh":  {"north": 29.47, "south": 26.65, "east": 97.42, "west": 91.55},
    "Sikkim":             {"north": 28.13, "south": 27.08, "east": 88.92, "west": 88.01},
}

BHUVAN_BASE_URL = "https://bhuvan-app3.nrsc.gov.in"
BHUVAN_ODA_URL = f"{BHUVAN_BASE_URL}/data/download/"
BHUVAN_WMS_URL = f"{BHUVAN_BASE_URL}/bhuvan/wms"
BHUVAN_WCS_URL = f"{BHUVAN_BASE_URL}/bhuvan/wcs"
BHUVAN_WFS_URL = f"{BHUVAN_BASE_URL}/bhuvan/wfs"

# Dataset catalog with Bhuvan layer identifiers and download endpoints
DATASET_CATALOG = {
    "cartodem": {
        "name": "Cartosat DEM (CartoDEM)",
        "description": "Digital Elevation Model at 10m/30m resolution for NER states",
        "layer_prefix": "cartodem",
        "resolutions": ["10m", "30m"],
        "format": "GeoTIFF",
        "service": "wcs",
        "oda_path": "index.php?c=s&s=DEM",
        "coverage_ids": [
            "cartodem3_v3r1:CartoDEM_V3R1_30m",
            "cartodem3_v3r1:CartoDEM_V3R1_10m",
        ],
    },
    "liss3": {
        "name": "LISS-III Imagery",
        "description": "Multispectral satellite imagery from Resourcesat covering NER",
        "layer_prefix": "resourcesat",
        "format": "GeoTIFF",
        "service": "wcs",
        "oda_path": "index.php?c=s&s=RS2LISS3",
        "coverage_ids": [
            "resourcesat:RS2_LISS3_FCC",
            "resourcesat:RS2_LISS3_TOA",
        ],
    },
    "liss4": {
        "name": "LISS-IV Imagery",
        "description": "High-resolution multispectral imagery covering NER",
        "layer_prefix": "resourcesat",
        "format": "GeoTIFF",
        "service": "wcs",
        "oda_path": "index.php?c=s&s=RS2LISS4",
        "coverage_ids": [
            "resourcesat:RS2_LISS4_FCC",
        ],
    },
    "awifs": {
        "name": "AWiFS (Advanced Wide Field Sensor)",
        "description": "Wide-area coverage for flood/landslide monitoring",
        "layer_prefix": "resourcesat",
        "format": "GeoTIFF",
        "service": "wcs",
        "oda_path": "index.php?c=s&s=RS2AWIFS",
        "coverage_ids": [
            "resourcesat:RS2_AWIFS_FCC",
        ],
    },
    "risat1": {
        "name": "RISAT-1 SAR Data",
        "description": "Synthetic Aperture Radar for all-weather imaging (critical for monsoon)",
        "layer_prefix": "risat",
        "format": "GeoTIFF",
        "service": "wcs",
        "oda_path": "index.php?c=s&s=RISAT1",
        "coverage_ids": [
            "risat:RISAT1_SAR",
        ],
    },
    "resourcesat2": {
        "name": "Resourcesat-2/2A",
        "description": "Land use/land cover, vegetation indices for NER",
        "layer_prefix": "resourcesat",
        "format": "GeoTIFF",
        "service": "wcs",
        "oda_path": "index.php?c=s&s=RS2A",
        "coverage_ids": [
            "resourcesat:RS2A_LISS3_FCC",
            "resourcesat:RS2A_LISS3_NDVI",
        ],
    },
    "landslide_atlas": {
        "name": "Bhuvan Landslide Atlas",
        "description": "Historical landslide locations in India",
        "layer_prefix": "landslide",
        "format": "GeoJSON",
        "service": "wfs",
        "oda_path": "index.php?c=s&s=LHZ",
        "type_names": [
            "ndem:india_landslide_inventory",
            "ndem:landslide_hazard_zonation",
        ],
    },
    "flood_monitoring": {
        "name": "Bhuvan Flood Monitoring",
        "description": "Flood inundation maps from NRSC",
        "layer_prefix": "flood",
        "format": "GeoJSON",
        "service": "wfs",
        "oda_path": "index.php?c=s&s=FLOOD",
        "type_names": [
            "ndem:flood_affected_area",
            "ndem:flood_inundation",
        ],
    },
    "thematic": {
        "name": "Thematic Maps",
        "description": "Geology, geomorphology, soil type, drainage, lineaments for NER",
        "layer_prefix": "thematic",
        "format": "GeoJSON",
        "service": "wfs",
        "oda_path": "index.php?c=s&s=THEMATIC",
        "type_names": [
            "bhuvan:geology_map",
            "bhuvan:geomorphology_map",
            "bhuvan:soil_map",
            "bhuvan:drainage_map",
            "bhuvan:lineament_map",
        ],
    },
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    """Configure logging to both console and file."""
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"download_isro_{timestamp}.log"

    logger = logging.getLogger("download_isro")
    logger.setLevel(logging.DEBUG)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(fmt)
    console_handler.setFormatter(fmt)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


# ---------------------------------------------------------------------------
# Session / Auth
# ---------------------------------------------------------------------------

def create_session(max_retries: int = 5, backoff_factor: float = 1.0) -> requests.Session:
    """Create a requests session with retry logic."""
    session = requests.Session()
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST", "OPTIONS"],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": "NER-SHIELD/1.0 (Research; Satellite Data Collection)",
        "Accept": "application/json, application/geo+json, image/tiff, */*",
    })
    return session


def authenticate_bhuvan(
    session: requests.Session,
    username: Optional[str] = None,
    password: Optional[str] = None,
    logger: Optional[logging.Logger] = None,
) -> bool:
    """
    Authenticate with Bhuvan portal if credentials are provided.
    Falls back to environment variables BHUVAN_USER / BHUVAN_PASS.
    Many ODA datasets are publicly accessible without authentication.
    """
    username = username or os.environ.get("BHUVAN_USER", "")
    password = password or os.environ.get("BHUVAN_PASS", "")

    if not username or not password:
        if logger:
            logger.info("No Bhuvan credentials provided; using unauthenticated access.")
            logger.info("Set BHUVAN_USER and BHUVAN_PASS environment variables for authenticated access.")
        return False

    login_url = f"{BHUVAN_BASE_URL}/bhuvan/user/login"
    payload = {"username": username, "password": password}

    try:
        resp = session.post(login_url, data=payload, timeout=30)
        if resp.status_code == 200 and ("dashboard" in resp.url or "success" in resp.text.lower()):
            if logger:
                logger.info("Successfully authenticated with Bhuvan portal.")
            return True
        else:
            if logger:
                logger.warning(
                    "Bhuvan authentication may have failed (status=%d). "
                    "Continuing with unauthenticated access.",
                    resp.status_code,
                )
            return False
    except requests.RequestException as exc:
        if logger:
            logger.warning("Bhuvan authentication error: %s. Continuing unauthenticated.", exc)
        return False


# ---------------------------------------------------------------------------
# Download helpers
# ---------------------------------------------------------------------------

def compute_sha256(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def download_file(
    session: requests.Session,
    url: str,
    dest: Path,
    logger: logging.Logger,
    expected_checksum: Optional[str] = None,
    chunk_size: int = 1024 * 1024,
) -> Dict[str, Any]:
    """
    Download a file with resume support and integrity validation.
    Returns metadata dict for the manifest.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)

    headers = {}
    downloaded_bytes = 0
    mode = "wb"

    # Resume support
    if dest.exists():
        downloaded_bytes = dest.stat().st_size
        headers["Range"] = f"bytes={downloaded_bytes}-"
        mode = "ab"
        logger.info("Resuming download from byte %d: %s", downloaded_bytes, dest.name)

    start_time = time.time()
    try:
        resp = session.get(url, headers=headers, stream=True, timeout=120)

        if resp.status_code == 416:
            logger.info("File already fully downloaded: %s", dest.name)
            file_size = dest.stat().st_size
        elif resp.status_code in (200, 206):
            total_size = resp.headers.get("Content-Length")
            if total_size:
                total_size = int(total_size) + downloaded_bytes

            with open(dest, mode) as f:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        downloaded_bytes += len(chunk)

            file_size = dest.stat().st_size
            elapsed = time.time() - start_time
            speed = file_size / elapsed / 1024 / 1024 if elapsed > 0 else 0
            logger.info(
                "Downloaded %s (%.2f MB, %.2f MB/s)",
                dest.name,
                file_size / 1024 / 1024,
                speed,
            )
        else:
            logger.error("Download failed for %s: HTTP %d", url, resp.status_code)
            return {
                "status": "failed",
                "url": url,
                "http_status": resp.status_code,
                "error": f"HTTP {resp.status_code}",
            }
    except requests.RequestException as exc:
        logger.error("Download error for %s: %s", url, exc)
        return {
            "status": "failed",
            "url": url,
            "error": str(exc),
        }

    # Validate checksum
    file_hash = compute_sha256(dest)
    checksum_ok = True
    if expected_checksum:
        if file_hash != expected_checksum:
            logger.warning(
                "Checksum mismatch for %s! Expected: %s, Got: %s",
                dest.name, expected_checksum, file_hash,
            )
            checksum_ok = False
        else:
            logger.info("Checksum verified for %s", dest.name)

    return {
        "status": "success",
        "url": url,
        "file_path": str(dest),
        "file_size_bytes": dest.stat().st_size,
        "sha256": file_hash,
        "checksum_verified": checksum_ok,
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# OGC Service Downloaders
# ---------------------------------------------------------------------------

def download_wcs_coverage(
    session: requests.Session,
    coverage_id: str,
    bbox: Dict[str, float],
    output_path: Path,
    logger: logging.Logger,
    resolution: str = "30m",
) -> Dict[str, Any]:
    """Download raster data via WCS GetCoverage request."""
    params = {
        "service": "WCS",
        "version": "2.0.1",
        "request": "GetCoverage",
        "CoverageId": coverage_id,
        "format": "image/tiff",
        "subset": [
            f"Lat({bbox['south']},{bbox['north']})",
            f"Long({bbox['west']},{bbox['east']})",
        ],
    }

    url = f"{BHUVAN_WCS_URL}?{urlencode(params, doseq=True)}"
    logger.info("WCS GetCoverage: %s [bbox: %.1fN-%.1fN, %.1fE-%.1fE]",
                coverage_id, bbox['south'], bbox['north'], bbox['west'], bbox['east'])

    return download_file(session, url, output_path, logger)


def download_wfs_features(
    session: requests.Session,
    type_name: str,
    bbox: Dict[str, float],
    output_path: Path,
    logger: logging.Logger,
    max_features: int = 10000,
) -> Dict[str, Any]:
    """Download vector features via WFS GetFeature request."""
    bbox_str = f"{bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']},EPSG:4326"
    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeName": type_name,
        "outputFormat": "application/json",
        "bbox": bbox_str,
        "maxFeatures": str(max_features),
        "srsName": "EPSG:4326",
    }

    url = f"{BHUVAN_WFS_URL}?{urlencode(params)}"
    logger.info("WFS GetFeature: %s [bbox: %s]", type_name, bbox_str)

    return download_file(session, url, output_path, logger)


def download_wms_map(
    session: requests.Session,
    layer: str,
    bbox: Dict[str, float],
    output_path: Path,
    logger: logging.Logger,
    width: int = 4096,
    height: int = 4096,
) -> Dict[str, Any]:
    """Download rendered map image via WMS GetMap request."""
    bbox_str = f"{bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']}"
    params = {
        "service": "WMS",
        "version": "1.1.1",
        "request": "GetMap",
        "layers": layer,
        "bbox": bbox_str,
        "width": str(width),
        "height": str(height),
        "srs": "EPSG:4326",
        "format": "image/tiff",
        "transparent": "true",
    }

    url = f"{BHUVAN_WMS_URL}?{urlencode(params)}"
    logger.info("WMS GetMap: %s [%dx%d]", layer, width, height)

    return download_file(session, url, output_path, logger)


def download_oda_page(
    session: requests.Session,
    oda_path: str,
    state: str,
    output_dir: Path,
    logger: logging.Logger,
) -> List[Dict[str, Any]]:
    """
    Scrape and download files from Bhuvan ODA catalog page.
    Attempts to find direct download links from the catalog listing.
    """
    url = urljoin(BHUVAN_ODA_URL, oda_path)
    results = []

    try:
        resp = session.get(url, timeout=60)
        resp.raise_for_status()
        content = resp.text

        # Extract download links from the page
        # Bhuvan ODA pages typically have links in href attributes pointing to data files
        import re
        link_pattern = re.compile(
            r'href=["\']([^"\']*(?:\.tif|\.tiff|\.shp|\.geojson|\.zip|\.tar\.gz)[^"\']*)["\']',
            re.IGNORECASE,
        )
        links = link_pattern.findall(content)

        # Filter links relevant to the state/NER region
        state_lower = state.lower().replace(" ", "")
        ner_keywords = ["northeast", "ner", "ne_india"] + [s.lower().replace(" ", "") for s in NER_STATES]

        for link in links:
            link_lower = link.lower()
            # Check if link is relevant to our region
            if any(kw in link_lower for kw in ner_keywords) or state_lower in link_lower:
                full_url = urljoin(url, link)
                filename = os.path.basename(urlparse(full_url).path)
                if not filename:
                    filename = f"bhuvan_data_{state_lower}_{len(results):03d}.dat"
                dest = output_dir / state / filename
                result = download_file(session, full_url, dest, logger)
                result["source_page"] = url
                results.append(result)

        if not links:
            logger.info("No direct download links found on ODA page: %s", url)
            logger.info("This dataset may require manual download or authenticated access.")
            results.append({
                "status": "manual_required",
                "url": url,
                "message": "No direct download links found. Visit the URL to download manually.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    except requests.RequestException as exc:
        logger.error("Failed to access ODA page %s: %s", url, exc)
        results.append({
            "status": "failed",
            "url": url,
            "error": str(exc),
        })

    return results


# ---------------------------------------------------------------------------
# Dataset downloaders
# ---------------------------------------------------------------------------

def download_dataset_for_state(
    session: requests.Session,
    dataset_key: str,
    state: str,
    output_dir: Path,
    logger: logging.Logger,
) -> List[Dict[str, Any]]:
    """Download a specific dataset for a specific state."""
    catalog = DATASET_CATALOG[dataset_key]
    bbox = STATE_BBOXES.get(state, NER_BBOX)
    state_dir = output_dir / dataset_key / state.lower().replace(" ", "_")
    state_dir.mkdir(parents=True, exist_ok=True)

    results = []

    if catalog["service"] == "wcs":
        # Raster data via WCS
        for cov_id in catalog.get("coverage_ids", []):
            safe_name = cov_id.replace(":", "_").replace("/", "_")
            output_path = state_dir / f"{safe_name}_{state.lower().replace(' ', '_')}.tif"
            result = download_wcs_coverage(session, cov_id, bbox, output_path, logger)
            result["dataset"] = dataset_key
            result["state"] = state
            result["coverage_id"] = cov_id
            results.append(result)

    elif catalog["service"] == "wfs":
        # Vector data via WFS
        for type_name in catalog.get("type_names", []):
            safe_name = type_name.replace(":", "_").replace("/", "_")
            output_path = state_dir / f"{safe_name}_{state.lower().replace(' ', '_')}.geojson"
            result = download_wfs_features(session, type_name, bbox, output_path, logger)
            result["dataset"] = dataset_key
            result["state"] = state
            result["type_name"] = type_name
            results.append(result)

    # Also try ODA catalog page
    oda_path = catalog.get("oda_path")
    if oda_path:
        oda_results = download_oda_page(session, oda_path, state, state_dir, logger)
        for r in oda_results:
            r["dataset"] = dataset_key
            r["state"] = state
        results.extend(oda_results)

    return results


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(results: List[Dict[str, Any]], output_dir: Path, logger: logging.Logger):
    """Write download manifest JSON."""
    manifest = {
        "source": "ISRO Bhuvan",
        "download_tool": "NER-SHIELD download_isro.py",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
        "ner_bbox": NER_BBOX,
        "states_covered": NER_STATES,
        "total_downloads": len(results),
        "successful": sum(1 for r in results if r.get("status") == "success"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
        "manual_required": sum(1 for r in results if r.get("status") == "manual_required"),
        "total_size_bytes": sum(r.get("file_size_bytes", 0) for r in results),
        "downloads": results,
    }

    manifest_path = output_dir / "isro_bhuvan_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    # Print summary
    logger.info("=" * 60)
    logger.info("DOWNLOAD SUMMARY")
    logger.info("=" * 60)
    logger.info("Total attempted: %d", manifest["total_downloads"])
    logger.info("Successful:      %d", manifest["successful"])
    logger.info("Failed:          %d", manifest["failed"])
    logger.info("Manual required: %d", manifest["manual_required"])
    total_mb = manifest["total_size_bytes"] / 1024 / 1024
    logger.info("Total size:      %.2f MB", total_mb)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Download ISRO Bhuvan data for Northeast India",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download_isro.py --output-dir ./raw/isro_bhuvan
  python download_isro.py --output-dir ./raw/isro_bhuvan --datasets cartodem liss3
  python download_isro.py --output-dir ./raw/isro_bhuvan --states Assam Meghalaya
  python download_isro.py --output-dir ./raw/isro_bhuvan --username user --password pass
        """,
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./raw/isro_bhuvan",
        help="Output directory for downloaded data (default: ./raw/isro_bhuvan)",
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        choices=list(DATASET_CATALOG.keys()),
        default=list(DATASET_CATALOG.keys()),
        help="Datasets to download (default: all)",
    )
    parser.add_argument(
        "--states",
        nargs="+",
        default=NER_STATES,
        help="NER states to download data for (default: all 8 states)",
    )
    parser.add_argument(
        "--username",
        type=str,
        default=None,
        help="Bhuvan username (or set BHUVAN_USER env var)",
    )
    parser.add_argument(
        "--password",
        type=str,
        default=None,
        help="Bhuvan password (or set BHUVAN_PASS env var)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=5,
        help="Maximum retry attempts per download (default: 5)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would be downloaded without actually downloading",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD ISRO Bhuvan Downloader starting")
    logger.info("Output directory: %s", output_dir)
    logger.info("Datasets: %s", ", ".join(args.datasets))
    logger.info("States: %s", ", ".join(args.states))

    if args.dry_run:
        logger.info("DRY RUN MODE - No files will be downloaded")
        for ds_key in args.datasets:
            cat = DATASET_CATALOG[ds_key]
            for state in args.states:
                logger.info("  Would download: %s for %s via %s",
                            cat["name"], state, cat["service"].upper())
        return

    # Create session and authenticate
    session = create_session(max_retries=args.max_retries)
    authenticate_bhuvan(session, args.username, args.password, logger)

    all_results: List[Dict[str, Any]] = []

    for ds_key in args.datasets:
        catalog = DATASET_CATALOG[ds_key]
        logger.info("-" * 60)
        logger.info("Processing dataset: %s", catalog["name"])
        logger.info("Description: %s", catalog["description"])
        logger.info("-" * 60)

        for state in args.states:
            logger.info("  State: %s", state)
            try:
                results = download_dataset_for_state(
                    session, ds_key, state, output_dir, logger,
                )
                all_results.extend(results)
            except Exception as exc:
                logger.error("Unexpected error processing %s for %s: %s",
                             ds_key, state, exc, exc_info=True)
                all_results.append({
                    "status": "failed",
                    "dataset": ds_key,
                    "state": state,
                    "error": str(exc),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            # Rate limiting - be respectful to Bhuvan servers
            time.sleep(2)

    write_manifest(all_results, output_dir, logger)
    logger.info("ISRO Bhuvan download complete.")


if __name__ == "__main__":
    main()
