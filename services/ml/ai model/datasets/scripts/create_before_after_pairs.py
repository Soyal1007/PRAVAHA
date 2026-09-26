#!/usr/bin/env python3
"""
NER-SHIELD: Create Before/After Temporal Image Pairs
Downloads pre-event and post-event Sentinel-2 imagery for NER disaster events 2020-2026.
Pre-event: within 30 days before event. Post-event: within 14 days after event.
Also supports synthetic pair generation from normal images.

Usage:
    python create_before_after_pairs.py --output-dir ./processed/before_after_pairs
    python create_before_after_pairs.py --output-dir ./processed/before_after_pairs --synthetic --normal-dir ./processed/train/normal
"""

import argparse
import hashlib
import json
import logging
import os
import random
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import rasterio
    from rasterio.crs import CRS
    from rasterio.enums import Resampling
    from rasterio.warp import calculate_default_transform, reproject
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    from sentinelsat import SentinelAPI
    HAS_SENTINELSAT = True
except ImportError:
    HAS_SENTINELSAT = False

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NER_BBOX = {"north": 29.0, "south": 21.0, "east": 98.0, "west": 88.0}

# Known NER disaster events 2020-2026 with locations and types
NER_DISASTER_EVENTS = [
    # 2020
    {"id": "EVT-2020-001", "type": "flood", "date": "2020-07-15",
     "lat": 26.14, "lon": 91.77, "region": "Assam", "severity": "high",
     "description": "Brahmaputra floods 2020"},
    {"id": "EVT-2020-002", "type": "landslide", "date": "2020-06-23",
     "lat": 25.57, "lon": 91.88, "region": "Meghalaya", "severity": "medium",
     "description": "East Khasi Hills landslide"},
    # 2021
    {"id": "EVT-2021-001", "type": "flood", "date": "2021-07-14",
     "lat": 26.19, "lon": 91.73, "region": "Assam", "severity": "high",
     "description": "Assam floods 2021 — over 5M affected"},
    {"id": "EVT-2021-002", "type": "landslide", "date": "2021-10-29",
     "lat": 24.77, "lon": 93.90, "region": "Manipur", "severity": "high",
     "description": "NH-2 Manipur landslides"},
    {"id": "EVT-2021-003", "type": "flood", "date": "2021-06-18",
     "lat": 23.88, "lon": 91.25, "region": "Tripura", "severity": "medium",
     "description": "Tripura flash floods"},
    # 2022
    {"id": "EVT-2022-001", "type": "flood", "date": "2022-06-17",
     "lat": 24.82, "lon": 92.80, "region": "Assam", "severity": "high",
     "description": "Assam-Meghalaya floods June 2022"},
    {"id": "EVT-2022-002", "type": "landslide", "date": "2022-06-29",
     "lat": 25.30, "lon": 91.70, "region": "Meghalaya", "severity": "high",
     "description": "Cherrapunji landslides"},
    {"id": "EVT-2022-003", "type": "landslide", "date": "2022-06-30",
     "lat": 27.10, "lon": 93.62, "region": "Arunachal Pradesh", "severity": "medium",
     "description": "Itanagar landslide"},
    # 2023
    {"id": "EVT-2023-001", "type": "flood", "date": "2023-07-10",
     "lat": 26.73, "lon": 94.22, "region": "Assam", "severity": "high",
     "description": "Assam floods monsoon 2023"},
    {"id": "EVT-2023-002", "type": "landslide", "date": "2023-08-05",
     "lat": 23.73, "lon": 92.72, "region": "Mizoram", "severity": "high",
     "description": "Aizawl landslide"},
    {"id": "EVT-2023-003", "type": "landslide", "date": "2023-07-12",
     "lat": 25.67, "lon": 94.12, "region": "Nagaland", "severity": "medium",
     "description": "Kohima road landslide"},
    # 2024
    {"id": "EVT-2024-001", "type": "flood", "date": "2024-06-28",
     "lat": 26.19, "lon": 91.73, "region": "Assam", "severity": "high",
     "description": "Assam floods 2024"},
    {"id": "EVT-2024-002", "type": "landslide", "date": "2024-07-30",
     "lat": 24.77, "lon": 93.90, "region": "Manipur", "severity": "high",
     "description": "Manipur landslide disaster 2024"},
    {"id": "EVT-2024-003", "type": "flood", "date": "2024-07-04",
     "lat": 27.33, "lon": 88.62, "region": "Sikkim", "severity": "medium",
     "description": "Sikkim flash floods"},
    # 2025
    {"id": "EVT-2025-001", "type": "flood", "date": "2025-07-08",
     "lat": 26.14, "lon": 91.77, "region": "Assam", "severity": "high",
     "description": "Brahmaputra flooding 2025"},
    {"id": "EVT-2025-002", "type": "landslide", "date": "2025-08-12",
     "lat": 25.92, "lon": 93.73, "region": "Nagaland", "severity": "medium",
     "description": "NH-29 landslide Dimapur"},
    # 2026
    {"id": "EVT-2026-001", "type": "flood", "date": "2026-06-20",
     "lat": 26.63, "lon": 92.79, "region": "Assam", "severity": "high",
     "description": "Tezpur flooding 2026"},
    {"id": "EVT-2026-002", "type": "landslide", "date": "2026-07-15",
     "lat": 27.10, "lon": 93.62, "region": "Arunachal Pradesh", "severity": "high",
     "description": "Itanagar-Naharlagun landslide 2026"},
]


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(output_dir: Path) -> logging.Logger:
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"before_after_pairs_{timestamp}.log"

    logger = logging.getLogger("before_after_pairs")
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
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": "NER-SHIELD/1.0 (Research; Before/After Pair Collection)",
    })
    return session


def generate_pair_id() -> str:
    """Generate a unique pair ID in the format BA-XXXXX."""
    return f"BA-{uuid.uuid4().hex[:5].upper()}"


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Sentinel-2 pair download
# ---------------------------------------------------------------------------

CDSE_ODATA_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1"
CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"


def authenticate_cdse(session: requests.Session, logger: logging.Logger) -> Optional[str]:
    """Authenticate with CDSE and return token."""
    username = os.environ.get("COPERNICUS_USER", "")
    password = os.environ.get("COPERNICUS_PASS", "")
    if not username or not password:
        logger.info("No Copernicus credentials. Set COPERNICUS_USER and COPERNICUS_PASS.")
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
            session.headers["Authorization"] = f"Bearer {token}"
            logger.info("CDSE authentication successful.")
            return token
    except Exception as exc:
        logger.warning("CDSE auth error: %s", exc)
    return None


def query_sentinel2_scene(
    session: requests.Session,
    lat: float,
    lon: float,
    date_from: str,
    date_to: str,
    max_cloud: int = 30,
    logger: Optional[logging.Logger] = None,
) -> Optional[Dict]:
    """Query a Sentinel-2 scene closest to the given date range."""
    # Build small AOI around the event location (0.1 degree buffer)
    buf = 0.1
    aoi = (
        f"POLYGON(("
        f"{lon - buf} {lat - buf},"
        f"{lon + buf} {lat - buf},"
        f"{lon + buf} {lat + buf},"
        f"{lon - buf} {lat + buf},"
        f"{lon - buf} {lat - buf}))"
    )

    filters = [
        f"ContentDate/Start gt {date_from}T00:00:00.000Z",
        f"ContentDate/Start lt {date_to}T23:59:59.999Z",
        f"Collection/Name eq 'SENTINEL-2'",
        f"OData.CSC.Intersects(area=geography'SRID=4326;{aoi}')",
        f"Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq "
        f"'cloudCover' and att/Value lt {max_cloud}.00)",
    ]

    params = {
        "$filter": " and ".join(filters),
        "$orderby": "ContentDate/Start desc",
        "$top": "1",
    }

    try:
        resp = session.get(f"{CDSE_ODATA_URL}/Products", params=params, timeout=60)
        if resp.status_code == 200:
            products = resp.json().get("value", [])
            if products:
                return products[0]
    except Exception as exc:
        if logger:
            logger.debug("Query error: %s", exc)

    return None


def download_sentinel2_product(
    session: requests.Session,
    product: Dict,
    output_path: Path,
    logger: logging.Logger,
) -> bool:
    """Download a single Sentinel-2 product."""
    prod_id = product.get("Id", "")
    name = product.get("Name", prod_id)
    url = f"{CDSE_ODATA_URL}/Products({prod_id})/$value"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        resp = session.get(url, stream=True, timeout=300)
        if resp.status_code == 200:
            with open(output_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            logger.info("  Downloaded: %s (%.2f MB)",
                        name, output_path.stat().st_size / 1024 / 1024)
            return True
        else:
            logger.error("  Download failed: HTTP %d", resp.status_code)
    except Exception as exc:
        logger.error("  Download error: %s", exc)

    return False


def create_real_pair(
    event: Dict,
    session: requests.Session,
    output_dir: Path,
    logger: logging.Logger,
) -> Optional[Dict]:
    """Create a before/after pair for a real disaster event using Sentinel-2."""
    event_date = datetime.strptime(event["date"], "%Y-%m-%d")
    lat = event["lat"]
    lon = event["lon"]

    pair_id = generate_pair_id()
    pair_dir = output_dir / pair_id
    pair_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Creating real pair for event: %s (%s)",
                event["id"], event["description"])

    # Query pre-event image (within 30 days before)
    pre_start = (event_date - timedelta(days=30)).strftime("%Y-%m-%d")
    pre_end = (event_date - timedelta(days=1)).strftime("%Y-%m-%d")

    logger.info("  Querying pre-event image: %s to %s", pre_start, pre_end)
    pre_product = query_sentinel2_scene(session, lat, lon, pre_start, pre_end, logger=logger)

    # Query post-event image (within 14 days after)
    post_start = event_date.strftime("%Y-%m-%d")
    post_end = (event_date + timedelta(days=14)).strftime("%Y-%m-%d")

    logger.info("  Querying post-event image: %s to %s", post_start, post_end)
    post_product = query_sentinel2_scene(session, lat, lon, post_start, post_end, logger=logger)

    if not pre_product or not post_product:
        logger.warning("  Could not find both pre and post images for %s", event["id"])
        return None

    # Download both
    before_path = pair_dir / f"{pair_id}_before.zip"
    after_path = pair_dir / f"{pair_id}_after.zip"

    pre_ok = download_sentinel2_product(session, pre_product, before_path, logger)
    post_ok = download_sentinel2_product(session, post_product, after_path, logger)

    if not pre_ok or not post_ok:
        logger.warning("  Download failed for pair %s", pair_id)
        return None

    # Create pair metadata
    pair_meta = {
        "pair_id": pair_id,
        "before_image": str(before_path),
        "after_image": str(after_path),
        "change_mask": str(pair_dir / f"{pair_id}_mask.png"),
        "event_type": event["type"],
        "location": {"lat": lat, "lng": lon},
        "region": event["region"],
        "event_date": event["date"],
        "severity": event["severity"],
        "source": "Sentinel-2 / Copernicus",
        "is_synthetic": False,
        "event_id": event["id"],
        "event_description": event["description"],
        "pre_event_date": pre_product.get("ContentDate", {}).get("Start", ""),
        "post_event_date": post_product.get("ContentDate", {}).get("Start", ""),
        "created_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Save pair metadata
    meta_path = pair_dir / f"{pair_id}_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(pair_meta, f, indent=2)

    return pair_meta


# ---------------------------------------------------------------------------
# Synthetic pair generation
# ---------------------------------------------------------------------------

def simulate_landslide_scar(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simulate a landslide scar on a normal satellite image.
    Creates brown/gray patches on green terrain.
    Returns (modified_image, change_mask).
    """
    h, w = img.shape[:2]
    result = img.copy()
    mask = np.zeros((h, w), dtype=np.uint8)

    # Create 1-3 landslide scars
    n_scars = random.randint(1, 3)
    for _ in range(n_scars):
        # Random elliptical scar
        center_x = random.randint(w // 4, 3 * w // 4)
        center_y = random.randint(h // 4, 3 * h // 4)
        axis_x = random.randint(w // 20, w // 6)
        axis_y = random.randint(h // 10, h // 4)
        angle = random.uniform(0, 360)

        if HAS_CV2:
            scar_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.ellipse(scar_mask, (center_x, center_y), (axis_x, axis_y),
                        angle, 0, 360, 255, -1)
            # Add some noise to the edges
            kernel = np.ones((5, 5), np.uint8)
            scar_mask = cv2.dilate(scar_mask, kernel, iterations=1)
            scar_mask = cv2.GaussianBlur(scar_mask, (11, 11), 3)

            # Apply brown/gray color (simulating exposed soil/rock)
            scar_color = np.array([
                random.randint(100, 160),  # B
                random.randint(90, 140),   # G
                random.randint(80, 130),   # R
            ], dtype=np.float32)

            alpha = (scar_mask / 255.0).reshape(h, w, 1)
            result = (result * (1 - alpha * 0.8) + scar_color * alpha * 0.8).astype(np.uint8)
            mask[scar_mask > 128] = 255

    return result, mask


def simulate_flood_inundation(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simulate flood inundation on a normal satellite image.
    Adds water-colored areas to low-lying regions.
    Returns (modified_image, change_mask).
    """
    h, w = img.shape[:2]
    result = img.copy()
    mask = np.zeros((h, w), dtype=np.uint8)

    # Simulate water expansion from one side
    flood_mask = np.zeros((h, w), dtype=np.uint8)

    # Random flood region (large irregular polygon)
    n_points = random.randint(6, 12)
    points = []
    cx, cy = random.randint(w // 4, 3 * w // 4), random.randint(h // 2, h)
    for i in range(n_points):
        angle = 2 * np.pi * i / n_points
        r = random.uniform(w // 8, w // 3)
        px = int(cx + r * np.cos(angle) + random.uniform(-20, 20))
        py = int(cy + r * np.sin(angle) * 0.6 + random.uniform(-20, 20))
        points.append([max(0, min(w - 1, px)), max(0, min(h - 1, py))])

    if HAS_CV2:
        pts = np.array(points, dtype=np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(flood_mask, [pts], 255)
        flood_mask = cv2.GaussianBlur(flood_mask, (21, 21), 5)

        # Muddy water color
        water_color = np.array([
            random.randint(100, 140),  # B (water appears blue-brown)
            random.randint(80, 120),   # G
            random.randint(60, 100),   # R
        ], dtype=np.float32)

        alpha = (flood_mask / 255.0).reshape(h, w, 1)
        result = (result * (1 - alpha * 0.7) + water_color * alpha * 0.7).astype(np.uint8)
        mask[flood_mask > 128] = 255

    return result, mask


def simulate_road_damage(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simulate road blockage/damage (debris on road alignments).
    Returns (modified_image, change_mask).
    """
    h, w = img.shape[:2]
    result = img.copy()
    mask = np.zeros((h, w), dtype=np.uint8)

    if not HAS_CV2:
        return result, mask

    # Draw debris patches along a random road-like line
    n_debris = random.randint(2, 5)
    start_x = random.randint(0, w)
    start_y = random.randint(0, h)

    for _ in range(n_debris):
        dx = random.randint(-w // 6, w // 6)
        dy = random.randint(-h // 6, h // 6)
        cx = max(0, min(w - 1, start_x + dx))
        cy = max(0, min(h - 1, start_y + dy))

        radius = random.randint(5, 20)
        debris_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(debris_mask, (cx, cy), radius, 255, -1)
        debris_mask = cv2.GaussianBlur(debris_mask, (7, 7), 2)

        debris_color = np.array([
            random.randint(80, 130),
            random.randint(80, 120),
            random.randint(70, 110),
        ], dtype=np.float32)

        alpha = (debris_mask / 255.0).reshape(h, w, 1)
        result = (result * (1 - alpha * 0.6) + debris_color * alpha * 0.6).astype(np.uint8)
        mask[debris_mask > 128] = 255

        start_x = cx
        start_y = cy

    return result, mask


def create_synthetic_pair(
    normal_image_path: Path,
    event_type: str,
    output_dir: Path,
    logger: logging.Logger,
) -> Optional[Dict]:
    """Create a synthetic before/after pair from a normal image."""
    img = None
    if HAS_CV2:
        img = cv2.imread(str(normal_image_path), cv2.IMREAD_COLOR)
    if img is None and HAS_PIL:
        try:
            pil_img = Image.open(normal_image_path).convert("RGB")
            img = np.array(pil_img)[:, :, ::-1]  # RGB to BGR
        except Exception:
            pass

    if img is None:
        logger.warning("  Could not load image: %s", normal_image_path)
        return None

    pair_id = generate_pair_id()
    pair_dir = output_dir / pair_id
    pair_dir.mkdir(parents=True, exist_ok=True)

    # Apply disaster simulation
    if event_type == "landslide":
        after_img, change_mask = simulate_landslide_scar(img)
    elif event_type == "flood":
        after_img, change_mask = simulate_flood_inundation(img)
    elif event_type == "road_damage":
        after_img, change_mask = simulate_road_damage(img)
    else:
        after_img, change_mask = simulate_landslide_scar(img)  # Default

    # Add slight global modifications to before image (simulating temporal diff)
    before_img = img.copy()
    if HAS_CV2:
        # Slight brightness/contrast shift
        alpha = random.uniform(0.95, 1.05)
        beta = random.uniform(-5, 5)
        before_img = np.clip(alpha * before_img.astype(np.float32) + beta, 0, 255).astype(np.uint8)

    # Save images
    before_path = pair_dir / f"{pair_id}_before.tif"
    after_path = pair_dir / f"{pair_id}_after.tif"
    mask_path = pair_dir / f"{pair_id}_mask.png"

    if HAS_CV2:
        cv2.imwrite(str(before_path), before_img)
        cv2.imwrite(str(after_path), after_img)
        cv2.imwrite(str(mask_path), change_mask)
    elif HAS_PIL:
        Image.fromarray(before_img[:, :, ::-1]).save(before_path)
        Image.fromarray(after_img[:, :, ::-1]).save(after_path)
        Image.fromarray(change_mask).save(mask_path)

    # Assign random NER location
    region = random.choice(["Assam", "Meghalaya", "Manipur", "Mizoram",
                             "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim"])

    from datasets.scripts.download_isro import STATE_BBOXES  # noqa: avoid circular at module level
    try:
        bb = STATE_BBOXES.get(region, NER_BBOX)
    except Exception:
        bb = NER_BBOX
    lat = random.uniform(bb.get("south", 21), bb.get("north", 29))
    lon = random.uniform(bb.get("west", 88), bb.get("east", 98))

    pair_meta = {
        "pair_id": pair_id,
        "before_image": str(before_path),
        "after_image": str(after_path),
        "change_mask": str(mask_path),
        "event_type": event_type,
        "location": {"lat": round(lat, 4), "lng": round(lon, 4)},
        "region": region,
        "event_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "severity": random.choice(["low", "medium", "high"]),
        "source": "Synthetic (NER-SHIELD augmentation)",
        "is_synthetic": True,
        "source_image": str(normal_image_path),
        "simulation_method": event_type,
        "created_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    meta_path = pair_dir / f"{pair_id}_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(pair_meta, f, indent=2)

    logger.info("  Created synthetic %s pair: %s", event_type, pair_id)
    return pair_meta


# ---------------------------------------------------------------------------
# Alignment utility
# ---------------------------------------------------------------------------

def align_pair(
    before_path: Path,
    after_path: Path,
    output_dir: Path,
    logger: logging.Logger,
) -> Tuple[Optional[Path], Optional[Path]]:
    """Align before/after images to the same extent and resolution."""
    if not HAS_RASTERIO:
        logger.debug("  rasterio not available; skipping alignment.")
        return before_path, after_path

    try:
        with rasterio.open(before_path) as before_src, rasterio.open(after_path) as after_src:
            # Use the before image as the reference
            ref_transform = before_src.transform
            ref_crs = before_src.crs or CRS.from_epsg(4326)
            ref_width = before_src.width
            ref_height = before_src.height

            if before_src.bounds == after_src.bounds and before_src.res == after_src.res:
                logger.debug("  Images already aligned.")
                return before_path, after_path

            # Reproject after image to match before
            aligned_after = output_dir / f"aligned_{after_path.name}"
            kwargs = before_src.meta.copy()

            with rasterio.open(aligned_after, "w", **kwargs) as dst:
                for i in range(1, after_src.count + 1):
                    reproject(
                        source=rasterio.band(after_src, i),
                        destination=rasterio.band(dst, i),
                        src_transform=after_src.transform,
                        src_crs=after_src.crs or ref_crs,
                        dst_transform=ref_transform,
                        dst_crs=ref_crs,
                        resampling=Resampling.bilinear,
                    )

            logger.debug("  Aligned after image to before image extent/resolution.")
            return before_path, aligned_after

    except Exception as exc:
        logger.warning("  Alignment error: %s", exc)
        return before_path, after_path


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_real_pairs(
    output_dir: Path,
    logger: logging.Logger,
    events: Optional[List[Dict]] = None,
) -> List[Dict]:
    """Create real before/after pairs from Sentinel-2 for NER disaster events."""
    session = create_session()
    token = authenticate_cdse(session, logger)

    if not token:
        logger.warning("CDSE authentication failed. Real pair creation requires Copernicus credentials.")
        return []

    events = events or NER_DISASTER_EVENTS
    results = []

    for event in events:
        pair_meta = create_real_pair(event, session, output_dir, logger)
        if pair_meta:
            results.append(pair_meta)
        time.sleep(2)

    return results


def run_synthetic_pairs(
    normal_dir: Path,
    output_dir: Path,
    n_pairs: int,
    logger: logging.Logger,
) -> List[Dict]:
    """Create synthetic before/after pairs from normal images."""
    SUPPORTED = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
    normal_images = []
    for ext in SUPPORTED:
        normal_images.extend(normal_dir.rglob(f"*{ext}"))
        normal_images.extend(normal_dir.rglob(f"*{ext.upper()}"))
    normal_images = sorted(set(normal_images))

    if not normal_images:
        logger.error("No normal images found in %s", normal_dir)
        return []

    logger.info("Found %d normal images for synthetic pair generation.", len(normal_images))

    event_types = ["landslide", "flood", "road_damage"]
    results = []

    for i in range(n_pairs):
        src_image = random.choice(normal_images)
        event_type = event_types[i % len(event_types)]

        pair_meta = create_synthetic_pair(src_image, event_type, output_dir, logger)
        if pair_meta:
            results.append(pair_meta)

        if (i + 1) % 50 == 0:
            logger.info("  Created %d/%d synthetic pairs", i + 1, n_pairs)

    return results


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(
    real_pairs: List[Dict],
    synthetic_pairs: List[Dict],
    output_dir: Path,
    logger: logging.Logger,
):
    manifest = {
        "pipeline": "NER-SHIELD Before/After Pair Creator",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "output_dir": str(output_dir),
        "total_pairs": len(real_pairs) + len(synthetic_pairs),
        "real_pairs": len(real_pairs),
        "synthetic_pairs": len(synthetic_pairs),
        "by_event_type": {},
        "by_region": {},
        "pairs": real_pairs + synthetic_pairs,
    }

    all_pairs = real_pairs + synthetic_pairs
    for p in all_pairs:
        et = p.get("event_type", "unknown")
        manifest["by_event_type"][et] = manifest["by_event_type"].get(et, 0) + 1
        rg = p.get("region", "unknown")
        manifest["by_region"][rg] = manifest["by_region"].get(rg, 0) + 1

    manifest_path = output_dir / "before_after_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    logger.info("=" * 60)
    logger.info("BEFORE/AFTER PAIR SUMMARY")
    logger.info("Real pairs:      %d", len(real_pairs))
    logger.info("Synthetic pairs: %d", len(synthetic_pairs))
    logger.info("Total:           %d", len(all_pairs))
    logger.info("By event type:")
    for et, count in manifest["by_event_type"].items():
        logger.info("  %-20s %d", et, count)
    logger.info("By region:")
    for rg, count in manifest["by_region"].items():
        logger.info("  %-20s %d", rg, count)
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Create temporal before/after image pairs for disaster events",
    )
    parser.add_argument("--output-dir", type=str, required=True,
                        help="Output directory for image pairs")
    parser.add_argument("--real", action="store_true",
                        help="Create real pairs from Sentinel-2 (requires Copernicus credentials)")
    parser.add_argument("--synthetic", action="store_true",
                        help="Create synthetic pairs from normal images")
    parser.add_argument("--normal-dir", type=str, default=None,
                        help="Directory containing normal satellite images (for synthetic pairs)")
    parser.add_argument("--n-synthetic", type=int, default=100,
                        help="Number of synthetic pairs to create (default: 100)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed (default: 42)")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD Before/After Pair Creator starting")
    logger.info("Output: %s", output_dir)

    random.seed(args.seed)
    np.random.seed(args.seed)

    if not args.real and not args.synthetic:
        logger.info("No mode selected. Use --real and/or --synthetic.")
        logger.info("  --real      : Download Sentinel-2 pairs for disaster events")
        logger.info("  --synthetic : Generate synthetic pairs from normal images")
        return

    if args.dry_run:
        logger.info("DRY RUN MODE")
        if args.real:
            logger.info("Would create %d real pairs from disaster events:",
                        len(NER_DISASTER_EVENTS))
            for evt in NER_DISASTER_EVENTS:
                logger.info("  %s | %s | %s | %s",
                            evt["id"], evt["type"], evt["region"], evt["description"])
        if args.synthetic:
            logger.info("Would create %d synthetic pairs", args.n_synthetic)
        return

    real_pairs = []
    synthetic_pairs = []

    if args.real:
        logger.info("-" * 60)
        logger.info("Creating REAL before/after pairs from Sentinel-2")
        real_pairs = run_real_pairs(output_dir, logger)

    if args.synthetic:
        if not args.normal_dir:
            logger.error("--normal-dir required for synthetic pair generation.")
            return
        normal_dir = Path(args.normal_dir).resolve()
        if not normal_dir.exists():
            logger.error("Normal images directory does not exist: %s", normal_dir)
            return

        logger.info("-" * 60)
        logger.info("Creating SYNTHETIC before/after pairs")
        synthetic_pairs = run_synthetic_pairs(
            normal_dir, output_dir, args.n_synthetic, logger,
        )

    write_manifest(real_pairs, synthetic_pairs, output_dir, logger)
    logger.info("Before/after pair creation complete.")


if __name__ == "__main__":
    main()
