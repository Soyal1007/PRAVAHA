#!/usr/bin/env python3
"""
NER-SHIELD: USGS Landsat Data Downloader
Downloads Landsat 8/9 OLI imagery and SRTM DEM for Northeast India
using landsatxplore or USGS M2M API.

Usage:
    python download_landsat.py --output-dir ./raw/usgs_landsat
    python download_landsat.py --output-dir ./raw/usgs_landsat --products landsat8 srtm
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
from typing import Any, Dict, List, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from landsatxplore.api import API as LandsatAPI
    from landsatxplore.earthexplorer import EarthExplorer
    HAS_LANDSATXPLORE = True
except ImportError:
    HAS_LANDSATXPLORE = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NER_BBOX = {"north": 29.0, "south": 21.0, "east": 98.0, "west": 88.0}

NER_STATES = [
    "Assam", "Meghalaya", "Manipur", "Mizoram",
    "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim",
]

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

# USGS M2M API endpoint
M2M_URL = "https://m2m.cr.usgs.gov/api/api/json/stable"

# USGS EarthExplorer
EE_URL = "https://earthexplorer.usgs.gov"

# Landsat WRS-2 Path/Row tiles covering NER
NER_WRS2_TILES = [
    (136, 41), (136, 42), (136, 43), (136, 44),
    (137, 41), (137, 42), (137, 43), (137, 44),
    (138, 41), (138, 42), (138, 43),
    (139, 41), (139, 42), (139, 43),
    (140, 41), (140, 42),
    (135, 42), (135, 43), (135, 44),
]

# Product configurations
PRODUCT_CONFIGS = {
    "landsat8": {
        "name": "Landsat 8 OLI/TIRS",
        "dataset_name": "landsat_ot_c2_l2",
        "collection": "landsat_8_c2_l2",
        "description": "Landsat 8 Collection 2 Level-2 Surface Reflectance",
        "resolution": "30m",
        "bands": ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B10", "B11"],
    },
    "landsat9": {
        "name": "Landsat 9 OLI-2/TIRS-2",
        "dataset_name": "landsat_ot_c2_l2",
        "collection": "landsat_9_c2_l2",
        "description": "Landsat 9 Collection 2 Level-2 Surface Reflectance",
        "resolution": "30m",
        "bands": ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B10", "B11"],
    },
    "srtm": {
        "name": "SRTM DEM",
        "dataset_name": "srtm_v3",
        "description": "Shuttle Radar Topography Mission 1 arc-second DEM",
        "resolution": "30m",
        "service": "dem",
    },
}

# SRTM tile naming
SRTM_BASE_URL = "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11"


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"download_landsat_{timestamp}.log"

    logger = logging.getLogger("download_landsat")
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
# Helpers
# ---------------------------------------------------------------------------

def create_session(max_retries: int = 5) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=max_retries,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": "NER-SHIELD/1.0 (Research; Satellite Data Collection)",
    })
    return session


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# USGS M2M API
# ---------------------------------------------------------------------------

class USGSM2MAPI:
    """Client for USGS Machine-to-Machine (M2M) API."""

    def __init__(self, username: str, password: str, logger: logging.Logger):
        self.base_url = M2M_URL
        self.session = create_session()
        self.logger = logger
        self.api_key = None
        self._login(username, password)

    def _login(self, username: str, password: str):
        """Authenticate with USGS M2M API."""
        payload = {"username": username, "password": password}
        resp = self.session.post(
            f"{self.base_url}/login",
            json=payload,
            timeout=30,
        )
        if resp.status_code == 200:
            result = resp.json()
            if result.get("data"):
                self.api_key = result["data"]
                self.session.headers["X-Auth-Token"] = self.api_key
                self.logger.info("USGS M2M API login successful.")
            else:
                raise RuntimeError(f"M2M login failed: {result.get('errorMessage', 'Unknown error')}")
        else:
            raise RuntimeError(f"M2M login HTTP {resp.status_code}")

    def _request(self, endpoint: str, payload: Optional[Dict] = None) -> Dict:
        """Make an authenticated M2M API request."""
        resp = self.session.post(
            f"{self.base_url}/{endpoint}",
            json=payload or {},
            timeout=60,
        )
        if resp.status_code == 200:
            result = resp.json()
            if result.get("errorCode"):
                self.logger.error("M2M API error: %s", result.get("errorMessage"))
            return result
        else:
            self.logger.error("M2M HTTP %d for %s", resp.status_code, endpoint)
            return {"errorCode": resp.status_code, "errorMessage": f"HTTP {resp.status_code}"}

    def search_scenes(
        self,
        dataset_name: str,
        bbox: Dict[str, float],
        start_date: str,
        end_date: str,
        max_results: int = 50,
        max_cloud_cover: int = 30,
    ) -> List[Dict[str, Any]]:
        """Search for Landsat scenes within a bounding box and date range."""
        spatial_filter = {
            "filterType": "mbr",
            "lowerLeft": {"latitude": bbox["south"], "longitude": bbox["west"]},
            "upperRight": {"latitude": bbox["north"], "longitude": bbox["east"]},
        }

        acquisition_filter = {
            "start": start_date,
            "end": end_date,
        }

        cloud_filter = {
            "min": 0,
            "max": max_cloud_cover,
        }

        payload = {
            "datasetName": dataset_name,
            "spatialFilter": spatial_filter,
            "temporalFilter": acquisition_filter,
            "cloudCoverFilter": cloud_filter,
            "maxResults": max_results,
            "sortDirection": "DESC",
        }

        result = self._request("scene-search", payload)
        scenes = result.get("data", {}).get("results", [])
        self.logger.info("M2M search returned %d scenes for %s.", len(scenes), dataset_name)
        return scenes

    def get_download_options(self, dataset_name: str, entity_ids: List[str]) -> List[Dict]:
        """Get download options for scene entity IDs."""
        payload = {
            "datasetName": dataset_name,
            "entityIds": entity_ids,
        }
        result = self._request("download-options", payload)
        return result.get("data", [])

    def request_downloads(self, downloads: List[Dict]) -> List[Dict]:
        """Request download URLs for products."""
        payload = {"downloads": downloads}
        result = self._request("download-request", payload)
        return result.get("data", {}).get("availableDownloads", [])

    def logout(self):
        """Log out from M2M API."""
        try:
            self._request("logout")
            self.logger.info("M2M API logout successful.")
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Download with landsatxplore
# ---------------------------------------------------------------------------

def download_with_landsatxplore(
    product_key: str,
    config: Dict[str, Any],
    start_date: str,
    end_date: str,
    output_dir: Path,
    logger: logging.Logger,
    username: str,
    password: str,
    max_scenes: int = 50,
) -> List[Dict[str, Any]]:
    """Download Landsat scenes using landsatxplore library."""
    results = []
    product_dir = output_dir / product_key
    product_dir.mkdir(parents=True, exist_ok=True)

    try:
        api = LandsatAPI(username, password)
    except Exception as exc:
        logger.error("landsatxplore API login failed: %s", exc)
        return [{"status": "failed", "error": str(exc)}]

    try:
        scenes = api.search(
            dataset=config["dataset_name"],
            latitude=(NER_BBOX["south"] + NER_BBOX["north"]) / 2,
            longitude=(NER_BBOX["west"] + NER_BBOX["east"]) / 2,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=30,
            max_results=max_scenes,
        )
        logger.info("Found %d Landsat scenes.", len(scenes))
    except Exception as exc:
        logger.error("Scene search failed: %s", exc)
        api.logout()
        return [{"status": "failed", "error": f"Search failed: {exc}"}]

    api.logout()

    if not scenes:
        return [{"status": "no_data", "product": product_key}]

    # Download scenes
    try:
        ee = EarthExplorer(username, password)
    except Exception as exc:
        logger.error("EarthExplorer login failed: %s", exc)
        return [{"status": "failed", "error": str(exc)}]

    for idx, scene in enumerate(scenes[:max_scenes], 1):
        scene_id = scene.get("entity_id", scene.get("display_id", f"scene_{idx}"))
        logger.info("  [%d/%d] Downloading scene: %s", idx, min(len(scenes), max_scenes), scene_id)

        for attempt in range(1, 4):
            try:
                filepath = ee.download(scene_id, output_dir=str(product_dir))
                if filepath and Path(filepath).exists():
                    fpath = Path(filepath)
                    results.append({
                        "status": "success",
                        "scene_id": scene_id,
                        "file_path": str(fpath),
                        "file_size_bytes": fpath.stat().st_size,
                        "sha256": compute_sha256(fpath),
                        "cloud_cover": scene.get("cloud_cover", None),
                        "acquisition_date": str(scene.get("acquisition_date", "")),
                        "download_timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                    break
            except Exception as exc:
                logger.warning("  Download attempt %d failed: %s", attempt, exc)
                if attempt < 3:
                    time.sleep(10 * attempt)
        else:
            results.append({
                "status": "failed",
                "scene_id": scene_id,
                "error": "All download attempts failed",
            })

        time.sleep(3)

    ee.logout()
    return results


# ---------------------------------------------------------------------------
# Download with M2M API
# ---------------------------------------------------------------------------

def download_with_m2m(
    product_key: str,
    config: Dict[str, Any],
    start_date: str,
    end_date: str,
    output_dir: Path,
    logger: logging.Logger,
    username: str,
    password: str,
    max_scenes: int = 50,
) -> List[Dict[str, Any]]:
    """Download Landsat scenes using USGS M2M API directly."""
    results = []
    product_dir = output_dir / product_key
    product_dir.mkdir(parents=True, exist_ok=True)

    try:
        api = USGSM2MAPI(username, password, logger)
    except RuntimeError as exc:
        logger.error("M2M API login failed: %s", exc)
        return [{"status": "failed", "error": str(exc)}]

    # Search scenes
    scenes = api.search_scenes(
        dataset_name=config["dataset_name"],
        bbox=NER_BBOX,
        start_date=start_date,
        end_date=end_date,
        max_results=max_scenes,
    )

    if not scenes:
        api.logout()
        return [{"status": "no_data", "product": product_key}]

    # Get entity IDs
    entity_ids = [s.get("entityId", s.get("displayId", "")) for s in scenes if s]
    entity_ids = [eid for eid in entity_ids if eid]

    if not entity_ids:
        api.logout()
        return [{"status": "no_data", "product": product_key, "message": "No entity IDs found"}]

    # Get download options
    download_options = api.get_download_options(config["dataset_name"], entity_ids)

    # Filter for available downloads
    downloads_to_request = []
    for option in download_options:
        if option.get("available", False):
            downloads_to_request.append({
                "entityId": option.get("entityId"),
                "productId": option.get("id"),
            })

    if not downloads_to_request:
        logger.warning("No downloadable products available.")
        api.logout()
        return [{"status": "no_data", "message": "No downloadable products"}]

    # Request downloads
    available_downloads = api.request_downloads(downloads_to_request)
    logger.info("Got %d download URLs.", len(available_downloads))

    session = create_session()
    if api.api_key:
        session.headers["X-Auth-Token"] = api.api_key

    for idx, dl in enumerate(available_downloads, 1):
        url = dl.get("url", "")
        entity_id = dl.get("entityId", f"entity_{idx}")

        if not url:
            continue

        filename = dl.get("displayId", entity_id) + ".tar.gz"
        output_path = product_dir / filename

        logger.info("  [%d/%d] Downloading: %s", idx, len(available_downloads), filename)

        # Resume support
        headers = {}
        mode = "wb"
        if output_path.exists():
            existing_size = output_path.stat().st_size
            headers["Range"] = f"bytes={existing_size}-"
            mode = "ab"

        start_time = time.time()
        try:
            resp = session.get(url, headers=headers, stream=True, timeout=300)
            if resp.status_code in (200, 206):
                with open(output_path, mode) as f:
                    for chunk in resp.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)

                file_size = output_path.stat().st_size
                elapsed = time.time() - start_time
                speed = file_size / elapsed / 1024 / 1024 if elapsed > 0 else 0
                logger.info("  Downloaded %.2f MB (%.2f MB/s)", file_size / 1024 / 1024, speed)

                results.append({
                    "status": "success",
                    "entity_id": entity_id,
                    "file_path": str(output_path),
                    "file_size_bytes": file_size,
                    "sha256": compute_sha256(output_path),
                    "download_url": url,
                    "download_timestamp": datetime.now(timezone.utc).isoformat(),
                })
            else:
                logger.error("  HTTP %d for %s", resp.status_code, filename)
                results.append({
                    "status": "failed",
                    "entity_id": entity_id,
                    "http_status": resp.status_code,
                })
        except requests.RequestException as exc:
            logger.error("  Download error: %s", exc)
            results.append({
                "status": "failed",
                "entity_id": entity_id,
                "error": str(exc),
            })

        time.sleep(3)

    api.logout()
    return results


# ---------------------------------------------------------------------------
# SRTM DEM
# ---------------------------------------------------------------------------

def download_srtm_dem(
    session: requests.Session,
    output_dir: Path,
    logger: logging.Logger,
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Download SRTM DEM tiles covering NER region."""
    srtm_dir = output_dir / "srtm"
    srtm_dir.mkdir(parents=True, exist_ok=True)
    results = []

    # SRTM tiles are 1x1 degree, named like N26E088.SRTMGL1.hgt.zip
    for lat in range(int(NER_BBOX["south"]), int(NER_BBOX["north"]) + 1):
        for lon in range(int(NER_BBOX["west"]), int(NER_BBOX["east"]) + 1):
            lat_str = f"N{lat:02d}" if lat >= 0 else f"S{abs(lat):02d}"
            lon_str = f"E{lon:03d}" if lon >= 0 else f"W{abs(lon):03d}"

            tile_name = f"{lat_str}{lon_str}.SRTMGL1.hgt.zip"
            tile_url = f"{SRTM_BASE_URL}/{tile_name}"

            output_path = srtm_dir / tile_name

            if output_path.exists() and output_path.stat().st_size > 1024:
                logger.debug("  SRTM tile exists: %s", tile_name)
                results.append({
                    "status": "skipped",
                    "tile": tile_name,
                    "file_path": str(output_path),
                    "file_size_bytes": output_path.stat().st_size,
                })
                continue

            logger.info("  Downloading SRTM tile: %s", tile_name)

            # SRTM requires NASA Earthdata authentication
            auth = None
            if username and password:
                auth = (username, password)

            try:
                resp = session.get(tile_url, auth=auth, stream=True, timeout=120,
                                   allow_redirects=True)
                if resp.status_code == 200:
                    with open(output_path, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=1024 * 1024):
                            if chunk:
                                f.write(chunk)

                    results.append({
                        "status": "success",
                        "tile": tile_name,
                        "file_path": str(output_path),
                        "file_size_bytes": output_path.stat().st_size,
                        "sha256": compute_sha256(output_path),
                        "download_timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                elif resp.status_code == 404:
                    logger.debug("  SRTM tile not available (ocean/void): %s", tile_name)
                    results.append({"status": "not_available", "tile": tile_name})
                else:
                    results.append({
                        "status": "failed",
                        "tile": tile_name,
                        "http_status": resp.status_code,
                    })
            except requests.RequestException as exc:
                results.append({
                    "status": "failed",
                    "tile": tile_name,
                    "error": str(exc),
                })

            time.sleep(0.5)

    return results


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(results: List[Dict[str, Any]], output_dir: Path, logger: logging.Logger):
    manifest = {
        "source": "USGS (Landsat / SRTM)",
        "download_tool": "NER-SHIELD download_landsat.py",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
        "ner_bbox": NER_BBOX,
        "ner_wrs2_tiles": [{"path": p, "row": r} for p, r in NER_WRS2_TILES],
        "total_downloads": len(results),
        "successful": sum(1 for r in results if r.get("status") == "success"),
        "skipped": sum(1 for r in results if r.get("status") == "skipped"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
        "total_size_bytes": sum(r.get("file_size_bytes", 0) for r in results),
        "downloads": results,
    }

    manifest_path = output_dir / "landsat_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    logger.info("=" * 60)
    logger.info("LANDSAT/SRTM DOWNLOAD SUMMARY")
    logger.info("Total:      %d", manifest["total_downloads"])
    logger.info("Successful: %d", manifest["successful"])
    logger.info("Skipped:    %d", manifest["skipped"])
    logger.info("Failed:     %d", manifest["failed"])
    total_gb = manifest["total_size_bytes"] / 1024 / 1024 / 1024
    logger.info("Total size: %.2f GB", total_gb)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Download USGS Landsat/SRTM data for Northeast India",
    )
    parser.add_argument("--output-dir", type=str, default="./raw/usgs_landsat",
                        help="Output directory (default: ./raw/usgs_landsat)")
    parser.add_argument("--products", nargs="+",
                        choices=list(PRODUCT_CONFIGS.keys()) + ["all"],
                        default=["all"],
                        help="Products to download (default: all)")
    parser.add_argument("--start-date", type=str, default="2023-01-01",
                        help="Start date YYYY-MM-DD (default: 2023-01-01)")
    parser.add_argument("--end-date", type=str, default="2026-09-25",
                        help="End date YYYY-MM-DD (default: 2026-09-25)")
    parser.add_argument("--max-scenes", type=int, default=50,
                        help="Max scenes per product type (default: 50)")
    parser.add_argument("--username", type=str, default=None,
                        help="USGS EarthExplorer username (or USGS_USER env var)")
    parser.add_argument("--password", type=str, default=None,
                        help="USGS EarthExplorer password (or USGS_PASS env var)")
    parser.add_argument("--use-landsatxplore", action="store_true",
                        help="Use landsatxplore library instead of M2M API directly")
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD USGS Landsat/SRTM Downloader starting")
    logger.info("Output: %s", output_dir)
    logger.info("Date range: %s to %s", args.start_date, args.end_date)

    products = list(PRODUCT_CONFIGS.keys()) if "all" in args.products else args.products

    username = args.username or os.environ.get("USGS_USER", "")
    password = args.password or os.environ.get("USGS_PASS", "")

    if args.dry_run:
        logger.info("DRY RUN MODE")
        for pk in products:
            cfg = PRODUCT_CONFIGS[pk]
            logger.info("  [%s] %s — %s", pk, cfg["name"], cfg["description"])
        return

    if not username or not password:
        logger.warning(
            "USGS credentials not provided. Set USGS_USER and USGS_PASS env vars, "
            "or register at https://ers.cr.usgs.gov/register"
        )

    session = create_session(max_retries=args.max_retries)
    all_results: List[Dict[str, Any]] = []

    for product_key in products:
        config = PRODUCT_CONFIGS[product_key]
        logger.info("-" * 60)
        logger.info("Processing: %s", config["name"])

        if config.get("service") == "dem":
            results = download_srtm_dem(session, output_dir, logger, username, password)
            all_results.extend(results)
            continue

        if not username or not password:
            logger.error("USGS credentials required for Landsat downloads. Skipping %s.",
                         product_key)
            all_results.append({
                "status": "failed",
                "product": product_key,
                "error": "No USGS credentials",
            })
            continue

        if args.use_landsatxplore and HAS_LANDSATXPLORE:
            results = download_with_landsatxplore(
                product_key, config,
                args.start_date, args.end_date,
                output_dir, logger,
                username, password,
                args.max_scenes,
            )
        else:
            results = download_with_m2m(
                product_key, config,
                args.start_date, args.end_date,
                output_dir, logger,
                username, password,
                args.max_scenes,
            )

        all_results.extend(results)

    write_manifest(all_results, output_dir, logger)
    logger.info("Landsat/SRTM download complete.")


if __name__ == "__main__":
    main()
