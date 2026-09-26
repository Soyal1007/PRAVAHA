#!/usr/bin/env python3
"""
NER-SHIELD: IMD (India Meteorological Department) Weather Data Downloader
Downloads historical rainfall, extreme events, temperature, humidity, and wind data
from IMD Pune Data Supply Portal for Northeast India.

Usage:
    python download_imd.py --output-dir ./raw/imd_weather
    python download_imd.py --output-dir ./raw/imd_weather --start-year 2014 --end-year 2026
    python download_imd.py --output-dir ./raw/imd_weather --data-types rainfall temperature
"""

import argparse
import csv
import hashlib
import io
import json
import logging
import os
import re
import struct
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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

# IMD station codes/IDs for NER (representative stations)
NER_STATIONS = {
    "Assam": [
        {"name": "Guwahati", "id": "31592", "lat": 26.19, "lon": 91.73},
        {"name": "Dibrugarh", "id": "37449", "lat": 27.48, "lon": 94.91},
        {"name": "Tezpur", "id": "42410", "lat": 26.63, "lon": 92.79},
        {"name": "Silchar", "id": "42515", "lat": 24.82, "lon": 92.80},
        {"name": "Jorhat", "id": "42523", "lat": 26.73, "lon": 94.22},
        {"name": "North_Lakhimpur", "id": "42415", "lat": 27.24, "lon": 94.11},
        {"name": "Dhubri", "id": "42501", "lat": 26.02, "lon": 89.97},
    ],
    "Meghalaya": [
        {"name": "Shillong", "id": "42515", "lat": 25.57, "lon": 91.88},
        {"name": "Cherrapunji", "id": "42516", "lat": 25.30, "lon": 91.70},
        {"name": "Tura", "id": "42518", "lat": 25.52, "lon": 90.22},
    ],
    "Manipur": [
        {"name": "Imphal", "id": "42623", "lat": 24.77, "lon": 93.90},
    ],
    "Mizoram": [
        {"name": "Aizawl", "id": "42724", "lat": 23.73, "lon": 92.72},
        {"name": "Lunglei", "id": "42725", "lat": 22.88, "lon": 92.73},
    ],
    "Nagaland": [
        {"name": "Kohima", "id": "42527", "lat": 25.67, "lon": 94.12},
        {"name": "Dimapur", "id": "42528", "lat": 25.92, "lon": 93.73},
    ],
    "Tripura": [
        {"name": "Agartala", "id": "42724", "lat": 23.88, "lon": 91.25},
        {"name": "Kailashahar", "id": "42725", "lat": 24.33, "lon": 92.00},
    ],
    "Arunachal Pradesh": [
        {"name": "Itanagar", "id": "42410", "lat": 27.10, "lon": 93.62},
        {"name": "Pasighat", "id": "42411", "lat": 28.07, "lon": 95.33},
        {"name": "Ziro", "id": "42412", "lat": 27.55, "lon": 93.83},
    ],
    "Sikkim": [
        {"name": "Gangtok", "id": "42295", "lat": 27.33, "lon": 88.62},
        {"name": "Tadong", "id": "42296", "lat": 27.32, "lon": 88.60},
    ],
}

# IMD data portals and endpoints
IMD_BASE_URL = "https://www.imdpune.gov.in"
IMD_DATA_URL = "https://dsp.imdpune.gov.in"
IMD_AWS_URL = "https://aws.imdpune.gov.in"
IMD_OPEN_DATA_URL = "https://cdsp.imdpune.gov.in"

# IMD missing value markers
IMD_MISSING_VALUES = {-999.9, 999.9, -99.9, 99.9, -9999, 9999, -9, 99}

# Rainfall intensity classes for ML labels
RAINFALL_CLASSES = {
    "no_rain": (0.0, 2.5),
    "light": (2.5, 15.6),
    "moderate": (15.6, 64.5),
    "heavy": (64.5, 115.5),
    "very_heavy": (115.5, 204.4),
    "extremely_heavy": (204.4, float("inf")),
}

# Data type configurations
DATA_TYPES = {
    "rainfall": {
        "name": "Daily Rainfall",
        "description": "Daily station rainfall data for NER (minimum 10 years)",
        "unit": "mm",
        "frequency": "daily",
        "endpoints": [
            "/dsp/api/rainfall/daily",
            "/api/grid/rainfall/daily",
        ],
        "gridded_resolution": "0.25deg",
        "format": "CSV",
    },
    "extreme_rainfall": {
        "name": "Extreme Rainfall Events",
        "description": "Events exceeding 100mm/day and 200mm/day thresholds",
        "unit": "mm",
        "frequency": "event",
        "thresholds": [100, 200],
        "derived_from": "rainfall",
    },
    "temperature": {
        "name": "Temperature Records",
        "description": "Daily min/max temperature for NER stations",
        "unit": "degC",
        "frequency": "daily",
        "endpoints": [
            "/dsp/api/temperature/daily",
            "/api/grid/temperature/daily",
        ],
        "format": "CSV",
    },
    "humidity": {
        "name": "Relative Humidity",
        "description": "Surface observation humidity data for NER",
        "unit": "percent",
        "frequency": "daily",
        "endpoints": [
            "/dsp/api/humidity/daily",
        ],
        "format": "CSV",
    },
    "wind": {
        "name": "Wind Speed",
        "description": "Surface observation wind speed data for NER",
        "unit": "kmph",
        "frequency": "daily",
        "endpoints": [
            "/dsp/api/wind/daily",
        ],
        "format": "CSV",
    },
    "gpm_imerge": {
        "name": "GPM/IMERGE Satellite Rainfall",
        "description": "Satellite-derived rainfall estimates (gridded)",
        "unit": "mm",
        "frequency": "daily",
        "format": "NetCDF",
        "gridded_resolution": "0.1deg",
        "endpoints": [
            "/api/grid/gpm/daily",
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
    log_file = log_dir / f"download_imd_{timestamp}.log"

    logger = logging.getLogger("download_imd")
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
    """Create a requests session with retry logic."""
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
        "User-Agent": "NER-SHIELD/1.0 (Research; Weather Data Collection)",
        "Accept": "text/csv, application/json, application/x-netcdf, */*",
    })
    return session


def authenticate_imd(
    session: requests.Session,
    username: Optional[str] = None,
    password: Optional[str] = None,
    logger: Optional[logging.Logger] = None,
) -> bool:
    """Authenticate with IMD Data Supply Portal."""
    username = username or os.environ.get("IMD_USER", "")
    password = password or os.environ.get("IMD_PASS", "")

    if not username or not password:
        if logger:
            logger.info("No IMD credentials provided. Set IMD_USER and IMD_PASS env vars.")
            logger.info("Some datasets may require registration at %s", IMD_DATA_URL)
        return False

    login_url = f"{IMD_DATA_URL}/login"
    payload = {"username": username, "password": password}

    try:
        resp = session.post(login_url, data=payload, timeout=30)
        if resp.status_code == 200:
            if logger:
                logger.info("IMD authentication successful.")
            return True
        else:
            if logger:
                logger.warning("IMD authentication returned status %d.", resp.status_code)
            return False
    except requests.RequestException as exc:
        if logger:
            logger.warning("IMD authentication error: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def is_missing_value(value: Any) -> bool:
    """Check if a value matches IMD missing value conventions."""
    try:
        fval = float(value)
        return fval in IMD_MISSING_VALUES or abs(fval) > 900
    except (ValueError, TypeError):
        return value is None or str(value).strip() in ("", "NA", "N/A", "--", "***")


def classify_rainfall(mm_value: float) -> str:
    """Classify daily rainfall into intensity classes for ML labels."""
    if is_missing_value(mm_value):
        return "missing"
    for class_name, (low, high) in RAINFALL_CLASSES.items():
        if low <= mm_value < high:
            return class_name
    return "unknown"


def parse_imd_date(date_str: str) -> Optional[datetime]:
    """Parse IMD's various date formats."""
    formats = [
        "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d",
        "%d-%b-%Y", "%d %b %Y", "%d-%m-%y",
        "%Y%m%d", "%d%m%Y",
    ]
    date_str = date_str.strip()
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def clean_imd_value(value: str) -> Optional[float]:
    """Clean and convert IMD data values, handling missing markers."""
    value = str(value).strip()
    if not value:
        return None
    # Remove common artifacts
    value = re.sub(r'[*#T]', '', value)
    try:
        fval = float(value)
        if is_missing_value(fval):
            return None
        return fval
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# IMD Binary Grid File Parser
# ---------------------------------------------------------------------------

def parse_imd_binary_grid(
    filepath: Path,
    nx: int = 31,
    ny: int = 31,
    start_lon: float = 66.5,
    start_lat: float = 6.5,
    step: float = 0.25,
) -> List[Dict[str, Any]]:
    """
    Parse IMD's binary grid format (used for gridded rainfall/temperature).
    IMD distributes 0.25-degree gridded data in a custom binary format:
    - nx * ny float32 values per day
    - Missing values encoded as -999.0 or 99.9
    """
    records = []
    record_size = nx * ny * 4  # 4 bytes per float32

    with open(filepath, "rb") as f:
        data = f.read()

    n_days = len(data) // record_size

    for day_idx in range(n_days):
        offset = day_idx * record_size
        day_data = data[offset:offset + record_size]
        if len(day_data) < record_size:
            break

        values = struct.unpack(f"<{nx * ny}f", day_data)

        for j in range(ny):
            for i in range(nx):
                val = values[j * nx + i]
                lat = start_lat + j * step
                lon = start_lon + i * step

                # Filter to NER bounding box
                if (NER_BBOX["south"] <= lat <= NER_BBOX["north"]
                        and NER_BBOX["west"] <= lon <= NER_BBOX["east"]):
                    if not is_missing_value(val):
                        records.append({
                            "day_index": day_idx,
                            "lat": round(lat, 4),
                            "lon": round(lon, 4),
                            "value": round(val, 2),
                        })

    return records


# ---------------------------------------------------------------------------
# Download functions
# ---------------------------------------------------------------------------

def download_file(
    session: requests.Session,
    url: str,
    dest: Path,
    logger: logging.Logger,
    chunk_size: int = 1024 * 1024,
) -> Dict[str, Any]:
    """Download a file with resume support."""
    dest.parent.mkdir(parents=True, exist_ok=True)

    headers = {}
    downloaded_bytes = 0
    mode = "wb"

    if dest.exists():
        downloaded_bytes = dest.stat().st_size
        headers["Range"] = f"bytes={downloaded_bytes}-"
        mode = "ab"
        logger.info("Resuming download from byte %d: %s", downloaded_bytes, dest.name)

    start_time = time.time()
    try:
        resp = session.get(url, headers=headers, stream=True, timeout=120)

        if resp.status_code == 416:
            logger.info("File already complete: %s", dest.name)
            file_size = dest.stat().st_size
        elif resp.status_code in (200, 206):
            with open(dest, mode) as f:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        downloaded_bytes += len(chunk)
            file_size = dest.stat().st_size
            elapsed = time.time() - start_time
            speed = file_size / elapsed / 1024 / 1024 if elapsed > 0 else 0
            logger.info("Downloaded %s (%.2f MB, %.2f MB/s)",
                        dest.name, file_size / 1024 / 1024, speed)
        else:
            logger.error("Download failed for %s: HTTP %d", url, resp.status_code)
            return {"status": "failed", "url": url, "http_status": resp.status_code}
    except requests.RequestException as exc:
        logger.error("Download error for %s: %s", url, exc)
        return {"status": "failed", "url": url, "error": str(exc)}

    sha = compute_sha256(dest)
    return {
        "status": "success",
        "url": url,
        "file_path": str(dest),
        "file_size_bytes": dest.stat().st_size,
        "sha256": sha,
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def download_station_rainfall(
    session: requests.Session,
    station: Dict[str, Any],
    state: str,
    start_year: int,
    end_year: int,
    output_dir: Path,
    logger: logging.Logger,
) -> Dict[str, Any]:
    """Download daily rainfall data for a specific IMD station."""
    station_name = station["name"]
    station_id = station["id"]

    state_dir = output_dir / "rainfall" / state.lower().replace(" ", "_")
    state_dir.mkdir(parents=True, exist_ok=True)

    all_records = []

    for year in range(start_year, end_year + 1):
        # Try multiple endpoints/URLs for resilience
        urls = [
            f"{IMD_DATA_URL}/dsp/api/rainfall/daily?station={station_id}&year={year}",
            f"{IMD_OPEN_DATA_URL}/api/v1/rainfall/daily/{station_id}/{year}",
            f"{IMD_AWS_URL}/api/data/rainfall/{station_id}?from={year}-01-01&to={year}-12-31",
        ]

        downloaded = False
        for url in urls:
            try:
                resp = session.get(url, timeout=60)
                if resp.status_code == 200:
                    content_type = resp.headers.get("Content-Type", "")
                    if "json" in content_type:
                        data = resp.json()
                        if isinstance(data, list):
                            all_records.extend(data)
                        elif isinstance(data, dict) and "data" in data:
                            all_records.extend(data["data"])
                    elif "csv" in content_type or "text" in content_type:
                        reader = csv.DictReader(io.StringIO(resp.text))
                        for row in reader:
                            all_records.append(row)
                    downloaded = True
                    logger.info("  Downloaded rainfall %s %d from %s", station_name, year, url)
                    break
            except (requests.RequestException, json.JSONDecodeError, csv.Error) as exc:
                logger.debug("  Endpoint failed %s: %s", url, exc)
                continue

        if not downloaded:
            logger.warning("  Could not download rainfall data for %s %d", station_name, year)

        time.sleep(0.5)  # Rate limiting

    # Process and save
    output_file = state_dir / f"rainfall_{station_name.lower()}_{start_year}_{end_year}.csv"
    processed_records = []

    for record in all_records:
        # Normalize record keys and clean values
        cleaned = {}
        for key, val in record.items():
            key_lower = key.lower().strip()
            if "date" in key_lower:
                dt = parse_imd_date(str(val))
                cleaned["date"] = dt.strftime("%Y-%m-%d") if dt else str(val)
            elif "rain" in key_lower or "rf" in key_lower or "precip" in key_lower:
                cleaned["rainfall_mm"] = clean_imd_value(val)
            elif "temp" in key_lower and "max" in key_lower:
                cleaned["tmax_c"] = clean_imd_value(val)
            elif "temp" in key_lower and "min" in key_lower:
                cleaned["tmin_c"] = clean_imd_value(val)
            else:
                cleaned[key_lower] = val

        # Add metadata
        cleaned["station_name"] = station_name
        cleaned["station_id"] = station_id
        cleaned["state"] = state
        cleaned["lat"] = station["lat"]
        cleaned["lon"] = station["lon"]

        # Compute rainfall intensity class
        rf = cleaned.get("rainfall_mm")
        if rf is not None:
            cleaned["rainfall_class"] = classify_rainfall(rf)
            cleaned["is_extreme_100mm"] = rf >= 100.0
            cleaned["is_extreme_200mm"] = rf >= 200.0

        processed_records.append(cleaned)

    # Write CSV
    if processed_records:
        fieldnames = sorted(set().union(*(r.keys() for r in processed_records)))
        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(processed_records)
        logger.info("  Saved %d records to %s", len(processed_records), output_file)
    else:
        logger.warning("  No records to save for station %s", station_name)

    sha = compute_sha256(output_file) if output_file.exists() else ""

    return {
        "status": "success" if processed_records else "no_data",
        "station_name": station_name,
        "station_id": station_id,
        "state": state,
        "file_path": str(output_file),
        "num_records": len(processed_records),
        "file_size_bytes": output_file.stat().st_size if output_file.exists() else 0,
        "sha256": sha,
        "years": f"{start_year}-{end_year}",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def download_station_temperature(
    session: requests.Session,
    station: Dict[str, Any],
    state: str,
    start_year: int,
    end_year: int,
    output_dir: Path,
    logger: logging.Logger,
) -> Dict[str, Any]:
    """Download daily temperature data for a specific IMD station."""
    station_name = station["name"]
    station_id = station["id"]

    state_dir = output_dir / "temperature" / state.lower().replace(" ", "_")
    state_dir.mkdir(parents=True, exist_ok=True)

    all_records = []

    for year in range(start_year, end_year + 1):
        urls = [
            f"{IMD_DATA_URL}/dsp/api/temperature/daily?station={station_id}&year={year}",
            f"{IMD_OPEN_DATA_URL}/api/v1/temperature/daily/{station_id}/{year}",
        ]

        downloaded = False
        for url in urls:
            try:
                resp = session.get(url, timeout=60)
                if resp.status_code == 200:
                    content_type = resp.headers.get("Content-Type", "")
                    if "json" in content_type:
                        data = resp.json()
                        rows = data if isinstance(data, list) else data.get("data", [])
                        all_records.extend(rows)
                    else:
                        reader = csv.DictReader(io.StringIO(resp.text))
                        all_records.extend(reader)
                    downloaded = True
                    logger.info("  Downloaded temperature %s %d", station_name, year)
                    break
            except (requests.RequestException, json.JSONDecodeError) as exc:
                logger.debug("  Endpoint failed: %s", exc)
                continue

        if not downloaded:
            logger.warning("  Could not download temperature for %s %d", station_name, year)
        time.sleep(0.5)

    output_file = state_dir / f"temperature_{station_name.lower()}_{start_year}_{end_year}.csv"
    processed = []

    for record in all_records:
        cleaned = {}
        for key, val in record.items():
            key_lower = key.lower().strip()
            if "date" in key_lower:
                dt = parse_imd_date(str(val))
                cleaned["date"] = dt.strftime("%Y-%m-%d") if dt else str(val)
            elif "max" in key_lower and ("temp" in key_lower or "t" == key_lower[0:1]):
                cleaned["tmax_c"] = clean_imd_value(val)
            elif "min" in key_lower and ("temp" in key_lower or "t" == key_lower[0:1]):
                cleaned["tmin_c"] = clean_imd_value(val)
            else:
                cleaned[key_lower] = val

        cleaned["station_name"] = station_name
        cleaned["station_id"] = station_id
        cleaned["state"] = state
        cleaned["lat"] = station["lat"]
        cleaned["lon"] = station["lon"]
        processed.append(cleaned)

    if processed:
        fieldnames = sorted(set().union(*(r.keys() for r in processed)))
        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(processed)
        logger.info("  Saved %d records to %s", len(processed), output_file)

    sha = compute_sha256(output_file) if output_file.exists() else ""
    return {
        "status": "success" if processed else "no_data",
        "station_name": station_name, "state": state,
        "file_path": str(output_file),
        "num_records": len(processed),
        "sha256": sha,
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def download_gridded_rainfall(
    session: requests.Session,
    start_year: int,
    end_year: int,
    output_dir: Path,
    logger: logging.Logger,
) -> List[Dict[str, Any]]:
    """Download IMD gridded rainfall data (0.25 degree resolution)."""
    grid_dir = output_dir / "gridded_rainfall"
    grid_dir.mkdir(parents=True, exist_ok=True)
    results = []

    for year in range(start_year, end_year + 1):
        urls = [
            f"{IMD_DATA_URL}/dsp/data/rainfall/gridded/0.25/{year}.grd",
            f"{IMD_OPEN_DATA_URL}/gridded/rainfall/{year}.grd",
            f"{IMD_BASE_URL}/lrfindex/data/rainfall_grid_{year}.grd",
        ]

        downloaded = False
        for url in urls:
            dest = grid_dir / f"rainfall_grid_{year}.grd"
            result = download_file(session, url, dest, logger)
            if result["status"] == "success":
                result["data_type"] = "gridded_rainfall"
                result["year"] = year
                results.append(result)

                # Parse binary grid and extract NER data
                try:
                    ner_records = parse_imd_binary_grid(dest)
                    if ner_records:
                        ner_csv = grid_dir / f"rainfall_grid_ner_{year}.csv"
                        with open(ner_csv, "w", newline="", encoding="utf-8") as f:
                            writer = csv.DictWriter(
                                f, fieldnames=["day_index", "lat", "lon", "value"],
                            )
                            writer.writeheader()
                            writer.writerows(ner_records)
                        logger.info("  Extracted %d NER grid points for %d",
                                    len(ner_records), year)
                except Exception as exc:
                    logger.warning("  Could not parse grid file for %d: %s", year, exc)

                downloaded = True
                break

        if not downloaded:
            logger.warning("  Could not download gridded rainfall for %d", year)
            results.append({
                "status": "failed", "year": year,
                "data_type": "gridded_rainfall",
                "download_timestamp": datetime.now(timezone.utc).isoformat(),
            })

        time.sleep(1)

    return results


def extract_extreme_events(
    output_dir: Path,
    logger: logging.Logger,
) -> Dict[str, Any]:
    """
    Scan downloaded rainfall CSVs and extract extreme rainfall events
    (>=100mm/day and >=200mm/day).
    """
    extreme_dir = output_dir / "extreme_rainfall"
    extreme_dir.mkdir(parents=True, exist_ok=True)

    events_100 = []
    events_200 = []

    rainfall_dir = output_dir / "rainfall"
    if not rainfall_dir.exists():
        logger.warning("No rainfall data directory found to extract extreme events.")
        return {"status": "no_data", "events_100mm": 0, "events_200mm": 0}

    for csv_file in rainfall_dir.rglob("*.csv"):
        try:
            with open(csv_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    rf = clean_imd_value(row.get("rainfall_mm", ""))
                    if rf is None:
                        continue
                    if rf >= 100.0:
                        event = {
                            "date": row.get("date", ""),
                            "station_name": row.get("station_name", ""),
                            "state": row.get("state", ""),
                            "lat": row.get("lat", ""),
                            "lon": row.get("lon", ""),
                            "rainfall_mm": rf,
                            "class": classify_rainfall(rf),
                            "source_file": str(csv_file),
                        }
                        events_100.append(event)
                        if rf >= 200.0:
                            events_200.append(event)
        except Exception as exc:
            logger.warning("Error processing %s for extreme events: %s", csv_file, exc)

    # Save extreme event files
    for threshold, events in [(100, events_100), (200, events_200)]:
        if events:
            out_file = extreme_dir / f"extreme_rainfall_{threshold}mm_events.csv"
            fieldnames = list(events[0].keys())
            with open(out_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(events)
            logger.info("Extracted %d extreme events (>=%dmm): %s",
                        len(events), threshold, out_file)

    return {
        "status": "success",
        "events_100mm": len(events_100),
        "events_200mm": len(events_200),
        "output_dir": str(extreme_dir),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def download_humidity_wind(
    session: requests.Session,
    station: Dict[str, Any],
    state: str,
    data_type: str,
    start_year: int,
    end_year: int,
    output_dir: Path,
    logger: logging.Logger,
) -> Dict[str, Any]:
    """Download humidity or wind speed data for a station."""
    station_name = station["name"]
    station_id = station["id"]

    state_dir = output_dir / data_type / state.lower().replace(" ", "_")
    state_dir.mkdir(parents=True, exist_ok=True)

    all_records = []
    for year in range(start_year, end_year + 1):
        urls = [
            f"{IMD_DATA_URL}/dsp/api/{data_type}/daily?station={station_id}&year={year}",
            f"{IMD_OPEN_DATA_URL}/api/v1/{data_type}/daily/{station_id}/{year}",
        ]
        for url in urls:
            try:
                resp = session.get(url, timeout=60)
                if resp.status_code == 200:
                    ct = resp.headers.get("Content-Type", "")
                    if "json" in ct:
                        data = resp.json()
                        rows = data if isinstance(data, list) else data.get("data", [])
                        all_records.extend(rows)
                    else:
                        reader = csv.DictReader(io.StringIO(resp.text))
                        all_records.extend(reader)
                    logger.info("  Downloaded %s %s %d", data_type, station_name, year)
                    break
            except (requests.RequestException, json.JSONDecodeError):
                continue
        time.sleep(0.5)

    output_file = state_dir / f"{data_type}_{station_name.lower()}_{start_year}_{end_year}.csv"
    processed = []
    for record in all_records:
        cleaned = {"station_name": station_name, "station_id": station_id,
                    "state": state, "lat": station["lat"], "lon": station["lon"]}
        for key, val in record.items():
            key_lower = key.lower().strip()
            if "date" in key_lower:
                dt = parse_imd_date(str(val))
                cleaned["date"] = dt.strftime("%Y-%m-%d") if dt else str(val)
            else:
                cleaned_val = clean_imd_value(val)
                cleaned[key_lower] = cleaned_val if cleaned_val is not None else val
        processed.append(cleaned)

    if processed:
        fieldnames = sorted(set().union(*(r.keys() for r in processed)))
        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(processed)

    sha = compute_sha256(output_file) if output_file.exists() else ""
    return {
        "status": "success" if processed else "no_data",
        "data_type": data_type, "station_name": station_name, "state": state,
        "file_path": str(output_file), "num_records": len(processed), "sha256": sha,
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def write_manifest(results: List[Dict[str, Any]], output_dir: Path, logger: logging.Logger):
    manifest = {
        "source": "India Meteorological Department (IMD)",
        "download_tool": "NER-SHIELD download_imd.py",
        "download_timestamp": datetime.now(timezone.utc).isoformat(),
        "ner_bbox": NER_BBOX,
        "states_covered": NER_STATES,
        "rainfall_classes": RAINFALL_CLASSES,
        "missing_value_markers": sorted(IMD_MISSING_VALUES),
        "total_downloads": len(results),
        "successful": sum(1 for r in results if r.get("status") == "success"),
        "failed": sum(1 for r in results if r.get("status") == "failed"),
        "downloads": results,
    }

    manifest_path = output_dir / "imd_weather_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    logger.info("Manifest written to %s", manifest_path)

    logger.info("=" * 60)
    logger.info("DOWNLOAD SUMMARY")
    logger.info("Total attempted: %d", manifest["total_downloads"])
    logger.info("Successful:      %d", manifest["successful"])
    logger.info("Failed:          %d", manifest["failed"])
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NER-SHIELD: Download IMD weather data for Northeast India",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--output-dir", type=str, default="./raw/imd_weather",
                        help="Output directory (default: ./raw/imd_weather)")
    parser.add_argument("--data-types", nargs="+",
                        choices=["rainfall", "extreme_rainfall", "temperature",
                                 "humidity", "wind", "gpm_imerge", "all"],
                        default=["all"],
                        help="Data types to download (default: all)")
    parser.add_argument("--states", nargs="+", default=NER_STATES,
                        help="NER states to collect data for")
    parser.add_argument("--start-year", type=int, default=2014,
                        help="Start year for historical data (default: 2014)")
    parser.add_argument("--end-year", type=int, default=2026,
                        help="End year for historical data (default: 2026)")
    parser.add_argument("--username", type=str, default=None,
                        help="IMD portal username (or set IMD_USER env var)")
    parser.add_argument("--password", type=str, default=None,
                        help="IMD portal password (or set IMD_PASS env var)")
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    logger = setup_logging(output_dir)
    logger.info("NER-SHIELD IMD Weather Data Downloader starting")
    logger.info("Output: %s | Years: %d-%d", output_dir, args.start_year, args.end_year)

    data_types = list(DATA_TYPES.keys()) if "all" in args.data_types else args.data_types

    if args.dry_run:
        logger.info("DRY RUN MODE")
        for dt in data_types:
            for state in args.states:
                stations = NER_STATIONS.get(state, [])
                logger.info("  Would download %s for %s (%d stations)",
                            dt, state, len(stations))
        return

    session = create_session(max_retries=args.max_retries)
    authenticate_imd(session, args.username, args.password, logger)

    all_results: List[Dict[str, Any]] = []

    # Station-based downloads
    for state in args.states:
        stations = NER_STATIONS.get(state, [])
        if not stations:
            logger.warning("No stations configured for %s", state)
            continue

        logger.info("-" * 60)
        logger.info("Processing state: %s (%d stations)", state, len(stations))

        for station in stations:
            if "rainfall" in data_types:
                result = download_station_rainfall(
                    session, station, state, args.start_year, args.end_year,
                    output_dir, logger,
                )
                all_results.append(result)

            if "temperature" in data_types:
                result = download_station_temperature(
                    session, station, state, args.start_year, args.end_year,
                    output_dir, logger,
                )
                all_results.append(result)

            if "humidity" in data_types:
                result = download_humidity_wind(
                    session, station, state, "humidity",
                    args.start_year, args.end_year, output_dir, logger,
                )
                all_results.append(result)

            if "wind" in data_types:
                result = download_humidity_wind(
                    session, station, state, "wind",
                    args.start_year, args.end_year, output_dir, logger,
                )
                all_results.append(result)

    # Gridded rainfall
    if "gpm_imerge" in data_types or "rainfall" in data_types:
        logger.info("-" * 60)
        logger.info("Downloading gridded rainfall data")
        grid_results = download_gridded_rainfall(
            session, args.start_year, args.end_year, output_dir, logger,
        )
        all_results.extend(grid_results)

    # Extract extreme events
    if "extreme_rainfall" in data_types or "rainfall" in data_types:
        logger.info("-" * 60)
        logger.info("Extracting extreme rainfall events")
        extreme_result = extract_extreme_events(output_dir, logger)
        all_results.append(extreme_result)

    write_manifest(all_results, output_dir, logger)
    logger.info("IMD download complete.")


if __name__ == "__main__":
    main()
