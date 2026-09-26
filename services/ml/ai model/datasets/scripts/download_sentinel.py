#!/usr/bin/env python3
"""
NER-SHIELD: Copernicus Sentinel Data Downloader
Downloads Sentinel-2 MSI (10m), Sentinel-1 SAR, Copernicus DEM,
and EMS activation maps for Northeast India.

Uses sentinelsat for Sentinel-1/2 queries and Copernicus Open Access Hub.

Usage:
    python download_sentinel.py --output-dir ./raw/copernicus_sentinel
    python download_sentinel.py --output-dir ./raw/copernicus_sentinel --products S2 --start-date 2023-01-01
"""

import argparse
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from sentinelsat import SentinelAPI, geojson_to_wkt, read_geojson
    HAS_SENTINELSAT = True
except ImportError:
    HAS_SENTINELSAT = False

try:
    from shapely.geometry import Polygon, box
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NER_BBOX = {"north": 29.0, "south": 21.0, "east": 98.0, "west": 88.0}

# NER Area of Interest polygon (simplified NER boundary)
NER_AOI_POLYGON = [
    (88.0, 21.0), (98.0, 21.0), (98.0, 29.0), (88.0, 29.0), (88.0, 21.0)
]

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

# Copernicus Data Space Ecosystem (CDSE) - new primary endpoint (replaces SciHub)
CDSE_BASE_URL = "https://dataspace.copernicus.eu"
CDSE_ODATA_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1"
CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

# Legacy SciHub (still accessible for some users)
SCIHUB_URL = "https://scihub.copernicus.eu/dhus"

# Copernicus DEM endpoint
COPDEM_URL = "https://prism-dem-open.copernicus.eu/pd-desk-open-access/prismDownload"

# EMS Rapid Mapping (Copernicus Emergency Management Service)
EMS_URL = "https://emergency.copernicus.eu/mapping/list-of-components"
EMS_API_URL = "https://emergency.copernicus.eu/mapping/api"

# Product type definitions
PRODUCT_CONFIGS = {
    "S2": {
        "name": "Sentinel-2 MSI",
        "platformname": "Sentinel-2",
        "producttype": "S2MSI2A",  # Level-2A (surface reflectance)
        "resolution": "10m",
        "description": "Multispectral imagery at 10m resolution (13 bands)",
        "max_cloud_cover": 30,
    },
    "S2_L1C": {
        "name": "Sentinel-2 MSI Level-1C",
        "platformname": "Sentinel-2",
        "producttype": "S2MSI1C",
        "resolution": "10m",
        "description": "Top-of-atmosphere reflectance",
        "max_cloud_cover": 30,
    },
    "S1_GRD": {
        "name": "Sentinel-1 SAR GRD",
        "platformname": "Sentinel-1",
        "producttype": "GRD",
        "resolution": "10m",
        "description": "SAR Ground Range Detected — all-weather imaging",
        "sensoroperationalmode": "IW",
        "polarisationmode": "VV VH",
    },
    "S1_SLC": {
        "name": "Sentinel-1 SAR SLC",
        "platformname": "Sentinel-1",
        "producttype": "SLC",
        "resolution": "5m",
        "description": "SAR Single Look Complex for interferometric analysis",
        "sensoroperationalmode": "IW",
    },
    "COP_DEM": {
        "name": "Copernicus DEM",
        "description": "Global 30m DEM from Copernicus",
        "resolution": "30m",
        "service": "dem",
    },
    "EMS": {
        "name": "Copernicus EMS Activation Maps",
        "description": "Emergency Management Service rapid mapping products",
        "service": "ems",
    },
}


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"download_sentinel_{timestamp}.log"

    logger = logging.getLogger("download_sentinel")
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
# Session
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


def get_aoi_wkt() -> str:
    """Generate WKT polygon for NER area of interest."""
    coords = " ".join(f"{lon} {lat}" for lon, lat in NER_AOI_POLYGON)
    return f"POLYGON(({coords}))"


def get_state_wkt(state: str) -> str:
    """Generate WKT polygon for a specific state's bounding box."""
    bb = STATE_BBOXES.get(state, NER_BBOX)
    coords = (
        f"{bb['west']} {bb['south']}, "
        f"{bb['east']} {bb['south']}, "
        f"{bb['east']} {bb['north']}, "
        f"{bb['west']} {bb['north']}, "
        f"{bb['west']} {bb['south']}"
    )
    return f"POLYGON(({coords}))"


# ---------------------------------------------------------------------------
# CDSE Authentication (Copernicus Data Space Ecosystem)
# ---------------------------------------------------------------------------

def authenticate_cdse(
    session: requests.Session,
    username: Optional[str] = None,
    password: Optional[str] = None,
    logger: Optional[logging.Logger] = None,
) -> Optional[str]:
    """Authenticate with Copernicus Data Space Ecosystem and return access token."""
    username = username or os.environ.get("COPERNICUS_USER", "")
    password = password or os.environ.get("COPERNICUS_PASS", "")

    if not username or not password:
        if logger:
            logger.info(
                "No Copernicus credentials provided. Set COPERNICUS_USER and "
                "COPERNICUS_PASS env vars, or register at %s", CDSE_BASE_URL
            )
        return None

    payload = {
        "client_id": "cdse-public",
        "grant_type": "password",
        "username": username,
        "password": password,
    }

    try:
        resp = session.post(CDSE_TOKEN_URL, data=payload, timeout=30)
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            if token:
                session.headers["Authorization"] = f"Bearer {token}"
                if logger:
                    logger.info("CDSE authentication successful.")
                return token
        if logger:
            logger.warning("CDSE authentication failed (status=%d).", resp.status_code)
    except requests.RequestException as exc:
        if logger:
            logger.warning("CDSE authentication error: %s", exc)

    return None


# ---------------------------------------------------------------------------
# sentinelsat-based download
# ---------------------------------------------------------------------------

def download_with_sentinelsat(
    product_key: str,
    config: Dict[str, Any],
    start_date: str,
    end_date: str,
    output_dir: Path,
    logger: logging.Logger,
    username: Optional[str] = None,
    password: Optional[str] = None,
    max_products: int = 50,
) -> List[Dict[str, Any]]:
    """Download Sentinel products using sentinelsat library."""
    if not HAS_SENTINELSAT:
        logger.error("sentinelsat not installed. Install with: pip install sentinelsat")
        return [{"status": "failed", "error": "sentinelsat not installed"}]

    username = username or os.environ.get("COPERNICUS_USER", "")
    password = password or os.environ.get("COPERNICUS_PASS", "")

    if not username or not password:
        logger.error("Copernicus credentials required for sentinelsat downloads.")
        return [{
            "status": "failed",
            "error": "No credentials. Set COPERNICUS_USER and COPERNICUS_PASS.",
        }]

    try:
        api = SentinelAPI(username, password, SCIHUB_URL)
    except Exception as exc:
        logger.warning("SciHub connection failed (%s), trying CDSE...", exc)
        try:
            api = SentinelAPI(
                username, password,
                "https://catalogue.dataspace.copernicus.eu/odata/v1",
            )
        except Exception as exc2:
            logger.error("Could not connect to any Copernicus endpoint: %s", exc2)
            return [{"status": "failed", "error": str(exc2)}]

    footprint = get_aoi_wkt()
    results = []

    # Build query parameters
    query_params = {
        "area": footprint,
        "date": (start_date.replace("-", ""), end_date.replace("-", "")),
        "platformname": config["platformname"],
        "producttype": config["producttype"],
    }

    if "max_cloud_cover" in config:
        query_params["cloudcoverpercentage"] = (0, config["max_cloud_cover"])
    if "sensoroperationalmode" in config:
        query_params["sensoroperationalmode"] = config["sensoroperationalmode"]

    logger.info("Querying %s products from %s to %s...",
                config["name"], start_date, end_date)

    try:
        products = api.query(**query_params)
        logger.info("Found %d products matching query.", len(products))
    except Exception as exc:
        logger.error("Query failed: %s", exc)
        return [{"status": "failed", "error": f"Query failed: {exc}"}]

    if not products:
        logger.warning("No products found for the specified criteria.")
        return [{"status": "no_data", "query": query_params}]

    # Convert to DataFrame for sorting
    try:
        products_df = api.to_dataframe(products)
        # Sort by date (newest first) and take top N
        if "beginposition" in products_df.columns:
            products_df = products_df.sort_values("beginposition", ascending=False)
        products_df = products_df.head(max_products)
        product_ids = products_df.index.tolist()
    except Exception:
        product_ids = list(products.keys())[:max_products]

    logger.info("Will download %d products (limited to %d).",
                len(product_ids), max_products)

    # Download products
    product_dir = output_dir / product_key
    product_dir.mkdir(parents=True, exist_ok=True)

    for idx, prod_id in enumerate(product_ids, 1):
        prod_info = products.get(prod_id, {})
        title = prod_info.get("title", prod_id)
        size_mb = prod_info.get("size", 0)

        logger.info("  [%d/%d] Downloading %s (%.0f MB)...",
                     idx, len(product_ids), title, size_mb if isinstance(size_mb, (int, float)) else 0)

        for attempt in range(1, 4):
            try:
                dl_info = api.download(prod_id, directory_path=str(product_dir))
                if dl_info.get("downloaded", False) or dl_info.get("path"):
                    file_path = dl_info.get("path", "")
                    results.append({
                        "status": "success",
                        "product_id": str(prod_id),
                        "title": title,
                        "file_path": str(file_path),
                        "file_size_bytes": dl_info.get("size", 0),
                        "sha256": dl_info.get("sha3-256", ""),
                        "cloud_cover": prod_info.get("cloudcoverpercentage", None),
                        "sensing_date": str(prod_info.get("beginposition", "")),
                        "download_timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                    break
                else:
                    logger.warning("  Download returned no file for %s (attempt %d)",
                                    title, attempt)
            except Exception as exc:
                logger.warning("  Download error for %s (attempt %d): %s",
                                title, attempt, exc)
                if attempt < 3:
                    time.sleep(10 * attempt)

        else:
            results.append({
                "status": "failed",
                "product_id": str(prod_id),
                "title": title,
                "error": "All download attempts failed",
            })

        time.sleep(2)  # Rate limiting

    return results


# ---------------------------------------------------------------------------
# CDSE OData-based download
# ---------------------------------------------------------------------------

def query_cdse_products(
    session: requests.Session,
    product_type: str,
    start_date: str,
    end_date: str,
    bbox: Dict[str, float],
    logger: logging.Logger,
    max_results: int = 50,
    cloud_cover_max: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Query products from Copernicus Data Space Ecosystem OData API."""
    # Build OData filter
    filters = [
        f"ContentDate/Start gt {start_date}T00:00:00.000Z",
        f"ContentDate/Start lt {end_date}T23:59:59.999Z",
        f"Collection/Name eq '{product_type}'",
        f"OData.CSC.Intersects(area=geography'SRID=4326;POLYGON(("
        f"{bbox['west']} {bbox['south']},"
        f"{bbox['east']} {bbox['south']},"
        f"{bbox['east']} {bbox['north']},"
        f"{bbox['west']} {bbox['north']},"
        f"{bbox['west']} {bbox['south']}))')",
    ]

    if cloud_cover_max is not None:
        filters.append(
            f"Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq "
            f"'cloudCover' and att/Value lt {cloud_cover_max}.00)"
        )

    filter_str = " and ".join(filters)

    url = f"{CDSE_ODATA_URL}/Products"
    params = {
        "$filter": filter_str,
        "$orderby": "ContentDate/Start desc",
        "$top": str(max_results),
        "$expand": "Attributes",
    }

    try:
        resp = session.get(url, params=params, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            products = data.get("value", [])
            logger.info("CDSE query returned %d products.", len(products))
            return products
        else:
            logger.error("CDSE query failed: HTTP %d", resp.status_code)
            return []
    except Exception as exc:
        logger.error("CDSE query error: %s", exc)
        return []


def download_cdse_product(
    session: requests.Session,
    product: Dict[str, Any],
    output_dir: Path,
    logger: logging.Logger,
) -> Dict[str, Any]:
    """Download a single product from CDSE."""
    prod_id = product.get("Id", "")
    name = product.get("Name", prod_id)
    size = product.get("ContentLength", 0)

    download_url = f"{CDSE_ODATA_URL}/Products({prod_id})/$value"

    output_path = output_dir / name
    if output_path.suffix == "":
        output_path = output_path.with_suffix(".zip")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Resume support
    headers = {}
    mode = "wb"
    existing_bytes = 0
    if output_path.exists():
        existing_bytes = output_path.stat().st_size
        if size and existing_bytes >= size:
            logger.info("  Already downloaded: %s", name)
            return {
                "status": "success",
                "product_id": prod_id,
                "title": name,
                "file_path": str(output_path),
                "file_size_bytes": existing_bytes,
                "sha256": compute_sha256(output_path),
                "download_timestamp": datetime.now(timezone.utc).isoformat(),
            }
        headers["Range"] = f"bytes={existing_bytes}-"
        mode = "ab"

    start_time = time.time()
    try:
        resp = session.get(download_url, headers=headers, stream=True, timeout=300)
        if resp.status_code in (200, 206):
            with open(output_path, mode) as f:
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)

            file_size = output_path.stat().st_size
            elapsed = time.time() - start_time
            speed = file_size / elapsed / 1024 / 1024 if elapsed > 0 else 0
            logger.info("  Downloaded %s (%.2f MB, %.2f MB/s)",
                        name, file_size / 1024 / 1024, speed)

            return {
                "status": "success",
                "product_id": prod_id,
                "title": name,
                "file_path": str(output_path),
                "file_size_bytes": file_size,
                "sha256": compute_sha256(output_path),
                "download_timestamp": datetime.now(timezone.utc).isoformat(),
            }
        else:
            logger.error("  Download failed: HTTP %d", resp.status_code)
            return {
                "status": "failed",
                "product_id": prod_id,
                "title": name,
                "http_status": resp.status_code,
            }
    except requests.RequestException as exc:
        logger.error("  Download error: %s", exc)
        return {"status": "failed", "product_id": prod_id, "title": name, "error": str(exc)}


# ---------------------------------------------------------------------------
# Copernicus DEM
# ---------------------------------------------------------------------------

def download_copernicus_dem(
    session: requests.Session,
    output_dir: Path,
    logger: logging.Logger,
) -> List[Dict[str, Any]]:
    """Download Copernicus DEM tiles covering NER region."""
    dem_dir = output_dir / "COP_DEM"
    dem_dir.mkdir(parents=True, exist_ok=True)
    results = []

    # COP-DEM is distributed in 1x1 degree tiles
    # Naming: Copernicus_DSM_COG_10_Nxx_00_Eyyy_00_DEM
    for lat in range(int(NER_BBOX["south"]), int(NER_BBOX["north"]) + 1):
        for lon in range(int(NER_BBOX["west"]), int(NER_BBOX["east"]) + 1):
            lat_str = f"N{lat:02d}" if lat >= 0 else f"S{abs(lat):02d}"
            lon_str = f"E{lon:03d}" if lon >= 0 else f"W{abs(lon):03d}"

            tile_name = f"Copernicus_DSM_COG_30_{lat_str}_00_{lon_str}_00_DEM"
            tile_url = (
                f"https://prism-dem-open.copernicus.eu/pd-desk-open-access/"
                f"prismDownload/CopDEM_GLO-30-DGED__2023_1/{tile_name}.tif"
            )

            output_path = dem_dir / f"{tile_name}.tif"
            if output_path.exists() and output_path.stat().st_size > 1024:
                logger.debug("  DEM tile already exists: %s", tile_name)
                results.append({
                    "status": "skipped",
                    "tile": tile_name,
                    "file_path": str(output_path),
                    "file_size_bytes": output_path.stat().st_size,
                })
                continue

            logger.info("  Downloading DEM tile: %s_%s", lat_str, lon_str)
            try:
                resp = session.get(tile_url, stream=True, timeout=120)
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
                else:
                    results.append({
                        "status": "failed",
                        "tile": tile_name,
                        "http_status": resp.status_code,
                    })
            except requests.RequestException as exc:
                results.append({
                    "status": "failed", "tile": tile_name, "error": str(exc),
                })

            time.sleep(0.5)

    return results


# ---------------------------------------------------------------------------
# EMS Activation Maps
# ---------------------------------------------------------------------------

def download_ems_activations(
    session: requests.Session,
    output_dir: Path,
    logger: logging.Logger,
    start_year: int = 2020,
) -> List[Dict[str, Any]]:
    """Download Copernicus EMS activation maps relevant to NER India."""
    ems_dir = output_dir / "EMS"
    ems_dir.mkdir(parents=True, exist_ok=True)
    results = []

    # Known EMS activations relevant to Northeast India
    ner_activations = [
        {"id": "EMSR504", "event": "Floods in Assam, India", "year": 2021},
        {"id": "EMSR564", "event": "Floods in Assam and Meghalaya, India", "year": 2022},
        {"id": "EMSR595", "event": "Landslides and floods in Manipur, India", "year": 2022},
        {"id": "EMSR624", "event": "Floods in Assam, India", "year": 2023},
        {"id": "EMSR656", "event": "Floods in Northeast India", "year": 2023},
        {"id": "EMSR678", "event": "Landslides in Mizoram, India", "year": 2023},
        {"id": "EMSR712", "event": "Floods in Assam, India", "year": 2024},
        {"id": "EMSR745", "event": "Landslides in Manipur, India", "year": 2024},
    ]

    for activation in ner_activations:
        act_id = activation["id"]
        if activation["year"] < start_year:
            continue

        logger.info("  Fetching EMS activation: %s — %s", act_id, activation["event"])

        # Try to get activation data via EMS API
        api_url = f"{EMS_API_URL}/activations/{act_id}"
        try:
            resp = session.get(api_url, timeout=30)
            if resp.status_code == 200:
                act_data = resp.json()
                act_dir = ems_dir / act_id
                act_dir.mkdir(parents=True, exist_ok=True)

                # Save activation metadata
                meta_file = act_dir / "activation_metadata.json"
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(act_data, f, indent=2, default=str)

                # Download vector products (shapefiles)
                products = act_data.get("products", [])
                for prod in products:
                    dl_url = prod.get("download_url", "")
                    if dl_url:
                        prod_name = prod.get("name", "product")
                        prod_file = act_dir / f"{prod_name}.zip"
                        try:
                            dl_resp = session.get(dl_url, stream=True, timeout=120)
                            if dl_resp.status_code == 200:
                                with open(prod_file, "wb") as f:
                                    for chunk in dl_resp.iter_content(chunk_size=1024 * 1024):
                                        if chunk:
                                            f.write(chunk)
                                results.append({
                                    "status": "success",
                                    "activation_id": act_id,
                                    "product": prod_name,
                                    "file_path": str(prod_file),
                                    "file_size_bytes": prod_file.stat().st_size,
                                    "download_timestamp": datetime.now(timezone.utc).isoformat(),
                                })
                        except requests.RequestException as exc:
                            logger.warning("  Could not download product %s: %s", prod_name, exc)

                results.append({
                    "status": "success",
                    "activation_id": act_id,
                    "event": activation["event"],
                    "metadata_file": str(meta_file),
                    "download_timestamp": datetime.now(timezone.utc).isoformat(),
                })
            else:
                # Try direct web page as fallback
                web_url = f"https://emergency.copernicus.eu/mapping/list-of-components/{act_id}"
                results.append({
                    "status": "manual_required",
                    "activation_id": act_id,
                    "event": activation["event"],
                    "url": web_url,
                    "message": "Visit URL to download EMS products manually.",
                })
        except requests.RequestException as exc:
            logger.warning("  EMS API error for %s: %s", act_id, exc)
            results.append({
                "status": "failed", "activation_id": act_id, "error": str(exc),
            })

        time.sleep(1)

    return results


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(results: List[Dict[str, Any]], output_dir: Path, logger: logging.Logger):
    manifest = {
        "source": "Copernicus (Sentinel / DEM / EMS)",
        "download_tool": "NER-SHIELD download_sentinel.py",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
        "ner_bbox": NER_BBOX,
        "total_downloads": len(results),
        "successful": sum(1 for r in results if r.get("status") == "success"),
        "skipped": sum(1 for r in results if r.get("status") == "skipped"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
        "total_size_bytes": sum(r.get("file_size_bytes", 0) for r in results),
        "downloads": results,
    }

    manifest_path = output_dir / "sentinel_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    logger.info("=" * 60)
    logger.info("SENTINEL DOWNLOAD SUMMARY")
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
        description="NER-SHIELD: Download Copernicus Sentinel data for Northeast India",
    )
    parser.add_argument("--output-dir", type=str, default="./raw/copernicus_sentinel",
                        help="Output directory (default: ./raw/copernicus_sentinel)")
    parser.add_argument("--products", nargs="+",
                        choices=list(PRODUCT_CONFIGS.keys()) + ["all"],
                        default=["all"],
                        help="Products to download (default: all)")
    parser.add_argument("--start-date", type=str, default="2023-01-01",
                        help="Start date YYYY-MM-DD (default: 2023-01-01)")
    parser.add_argument("--end-date", type=str, default="2026-09-25",
                        help="End date YYYY-MM-DD (default: 2026-09-25)")
    parser.add_argument("--max-products", type=int, default=50,
                        help="Max products to download per type (default: 50)")
    parser.add_argument("--username", type=str, default=None,
                        help="Copernicus username (or COPERNICUS_USER env var)")
    parser.add_argument("--password", type=str, default=None,
                        help="Copernicus password (or COPERNICUS_PASS env var)")
    parser.add_argument("--use-sentinelsat", action="store_true",
                        help="Use sentinelsat library instead of CDSE OData API")
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD Copernicus Sentinel Downloader starting")
    logger.info("Output: %s", output_dir)
    logger.info("Date range: %s to %s", args.start_date, args.end_date)

    products = list(PRODUCT_CONFIGS.keys()) if "all" in args.products else args.products
    logger.info("Products: %s", ", ".join(products))

    if args.dry_run:
        logger.info("DRY RUN MODE")
        for pk in products:
            cfg = PRODUCT_CONFIGS[pk]
            logger.info("  [%s] %s — %s", pk, cfg["name"], cfg["description"])
        return

    session = create_session(max_retries=args.max_retries)
    token = authenticate_cdse(session, args.username, args.password, logger)

    all_results: List[Dict[str, Any]] = []

    for product_key in products:
        config = PRODUCT_CONFIGS[product_key]
        logger.info("-" * 60)
        logger.info("Processing: %s", config["name"])

        # Special handling for DEM and EMS
        if config.get("service") == "dem":
            results = download_copernicus_dem(session, output_dir, logger)
            all_results.extend(results)
            continue

        if config.get("service") == "ems":
            results = download_ems_activations(session, output_dir, logger)
            all_results.extend(results)
            continue

        # Sentinel-1/2 products
        if args.use_sentinelsat and HAS_SENTINELSAT:
            results = download_with_sentinelsat(
                product_key, config,
                args.start_date, args.end_date,
                output_dir, logger,
                args.username, args.password,
                args.max_products,
            )
        else:
            # Use CDSE OData API
            collection_name = "SENTINEL-2" if "S2" in product_key else "SENTINEL-1"
            products_list = query_cdse_products(
                session, collection_name,
                args.start_date, args.end_date,
                NER_BBOX, logger,
                max_results=args.max_products,
                cloud_cover_max=config.get("max_cloud_cover"),
            )

            results = []
            product_dir = output_dir / product_key
            product_dir.mkdir(parents=True, exist_ok=True)

            for idx, prod in enumerate(products_list, 1):
                logger.info("  [%d/%d] %s", idx, len(products_list),
                            prod.get("Name", "unknown"))
                result = download_cdse_product(session, prod, product_dir, logger)
                results.append(result)
                time.sleep(2)

        all_results.extend(results)

    write_manifest(all_results, output_dir, logger)
    logger.info("Sentinel download complete.")


if __name__ == "__main__":
    main()
