"""NER-SHIELD FastAPI application.

AI-powered satellite image analysis backend for
North-East Region disaster management and border security monitoring.
"""

from __future__ import annotations

import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from config import settings
from inference import inference_engine
from routers import analysis

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("ner-shield")

# ── Test image directory (relative to this file) ─────────────────────
# Resolves to: services/ml/ai model/test_images/
TEST_IMAGES_DIR = Path(__file__).parent.parent / "test_images"

# Map of preset ID → folder name and human metadata
PRESET_CATALOG: dict[str, dict] = {
    "landslide_manipur": {
        "name": "NH-37 Manipur Hill Slope Landslide",
        "location": "Senapati District, Manipur — NH-37 Km 48-52",
        "state": "Manipur",
        "corridor": "NH-37 Imphal-Jiribam Corridor",
        "lat": 25.018,
        "lng": 93.734,
        "before_date": "2026-07-22",
        "after_date": "2026-09-18 (Post-Monsoon)",
        "satellite": "Resourcesat-2A LISS-IV / Sentinel-2 MSI",
        "gsd": "5.8 / 10.0 meters/pixel",
        "before_ndvi": 0.74,
        "after_ndvi": 0.19,
        "before_catalog_id": "ISRO_RS2A_L4_20260722_MNP_031",
        "after_catalog_id": "ISRO_BHUVAN_DMSP_20260918_LS_044",
    },
    "flood_brahmaputra": {
        "name": "Brahmaputra Basin Flood Inundation",
        "location": "Guwahati-Kamrup Corridor, Assam — NH-27",
        "state": "Assam",
        "corridor": "NH-27 Guwahati Bypass Corridor",
        "lat": 26.184,
        "lng": 91.748,
        "before_date": "2026-08-10",
        "after_date": "2026-09-23 (Post-Flood Observation)",
        "satellite": "Sentinel-2A MSI / ISRO RISAT-1 SAR",
        "gsd": "10.0 meters/pixel",
        "before_ndvi": 0.64,
        "after_ndvi": 0.18,
        "before_catalog_id": "ESA_S2A_MSI_20260810_GUW_008",
        "after_catalog_id": "ISRO_RISAT1_SAR_20260923_FLOOD_088",
    },
    "cyclone_odisha": {
        "name": "Odisha Cyclone Storm Damage",
        "location": "Bhubaneswar-Puri Coastal Corridor, Odisha",
        "state": "Odisha",
        "corridor": "NH-16 Bhubaneswar-Puri Highway",
        "lat": 20.296,
        "lng": 85.825,
        "before_date": "2026-05-10",
        "after_date": "2026-05-28 (Post-Cyclone)",
        "satellite": "ISRO Resourcesat-2A LISS-III / RISAT-2B",
        "gsd": "23.5 meters/pixel",
        "before_ndvi": 0.61,
        "after_ndvi": 0.31,
        "before_catalog_id": "ISRO_RS2A_L3_20260510_ORS_017",
        "after_catalog_id": "ISRO_RISAT2B_20260528_CYC_021",
    },
    "deforestation_meghalaya": {
        "name": "Meghalaya Forest Cover Loss",
        "location": "Ri Bhoi District, Meghalaya — Shillong Belt",
        "state": "Meghalaya",
        "corridor": "NH-44 Shillong Expressway Corridor",
        "lat": 25.578,
        "lng": 91.893,
        "before_date": "2026-01-15",
        "after_date": "2026-08-30 (Monsoon Season)",
        "satellite": "Resourcesat-2A LISS-IV",
        "gsd": "5.8 meters/pixel",
        "before_ndvi": 0.81,
        "after_ndvi": 0.44,
        "before_catalog_id": "ISRO_RS2A_L4_20260115_MEG_009",
        "after_catalog_id": "ISRO_RS2A_L4_20260830_MEG_041",
    },
    "drought_tripura": {
        "name": "Tripura Reservoir Water Recession",
        "location": "Gomati District, Tripura — Dumbur Reservoir",
        "state": "Tripura",
        "corridor": "NH-8 Agartala-Udaipur Corridor",
        "lat": 23.502,
        "lng": 91.752,
        "before_date": "2025-11-20",
        "after_date": "2026-04-15 (Pre-Monsoon Drought)",
        "satellite": "Resourcesat-2A LISS-III",
        "gsd": "23.5 meters/pixel",
        "before_ndvi": 0.55,
        "after_ndvi": 0.30,
        "before_catalog_id": "ISRO_RS2A_L3_20251120_TRP_007",
        "after_catalog_id": "ISRO_RS2A_L3_20260415_TRP_022",
    },
    "road_damage_mizoram": {
        "name": "Mizoram Mountain Road Debris Blockage",
        "location": "Aizawl-Lunglei Highway, Mizoram",
        "state": "Mizoram",
        "corridor": "NH-306 Aizawl-Lunglei Mountain Corridor",
        "lat": 23.726,
        "lng": 92.723,
        "before_date": "2026-06-01",
        "after_date": "2026-09-10 (Post-Monsoon Slide)",
        "satellite": "Resourcesat-2A LISS-IV / CartoDEM V3R1",
        "gsd": "5.8 meters/pixel",
        "before_ndvi": 0.68,
        "after_ndvi": 0.41,
        "before_catalog_id": "ISRO_RS2A_L4_20260601_MZR_014",
        "after_catalog_id": "ISRO_BHUVAN_20260910_MZR_038",
    },
    "urban_guwahati": {
        "name": "Guwahati Urban Expansion",
        "location": "Kamrup Metropolitan District, Assam",
        "state": "Assam",
        "corridor": "NH-27 / NH-37 Guwahati Ring Road Corridor",
        "lat": 26.144,
        "lng": 91.736,
        "before_date": "2023-01-10",
        "after_date": "2026-08-20 (Urban Growth)",
        "satellite": "Resourcesat-2A LISS-III",
        "gsd": "23.5 meters/pixel",
        "before_ndvi": 0.47,
        "after_ndvi": 0.33,
        "before_catalog_id": "ISRO_RS2A_L3_20230110_GUW_002",
        "after_catalog_id": "ISRO_RS2A_L3_20260820_GUW_059",
    },
}

# ── Lifespan ─────────────────────────────────────────────────────────
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting %s v%s", settings.app_name, settings.version)
    loaded = inference_engine.load_model()
    logger.info(
        "Real analysis engine ready (OpenCV + NumPy). Demo mode: %s",
        inference_engine.demo_mode,
    )
    yield


# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "AI-powered satellite image analysis API for monitoring "
        "India's North-Eastern Region. Provides change detection "
        "between before/after satellite image pairs."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ──────────────────────────────────────────────────────────
app.include_router(analysis.router, prefix="/api/v1")


# ── Root-level endpoints ─────────────────────────────────────────────
@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "demo_mode": inference_engine.demo_mode,
        "version": settings.version,
        "model_loaded": inference_engine.model_loaded,
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }


# ── Preset image catalog ─────────────────────────────────────────────
@app.get("/api/v1/presets", tags=["Presets"])
async def list_presets():
    """List all available satellite image preset pairs."""
    result = []
    for pid, meta in PRESET_CATALOG.items():
        folder = TEST_IMAGES_DIR / pid
        available = (folder / "before.jpg").exists() and (folder / "after.jpg").exists()
        result.append({
            "id": pid,
            "available": available,
            **meta,
        })
    return {"presets": result}


@app.get("/api/v1/presets/{preset_id}/image/{which}", tags=["Presets"])
async def get_preset_image(preset_id: str, which: str):
    """Serve the actual satellite test image (before or after) for a preset."""
    if preset_id not in PRESET_CATALOG:
        raise HTTPException(404, f"Unknown preset: {preset_id}")
    if which not in ("before", "after"):
        raise HTTPException(400, "'which' must be 'before' or 'after'")

    img_path = TEST_IMAGES_DIR / preset_id / f"{which}.jpg"
    if not img_path.exists():
        raise HTTPException(404, f"Image not found: {img_path}")

    return FileResponse(
        path=str(img_path),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-Preset-Id": preset_id,
            "X-Image-Type": which,
        },
    )


@app.post("/api/v1/analyze/preset/{preset_id}", tags=["Analysis"])
async def analyze_preset(preset_id: str):
    """Run real OpenCV change detection on a named preset pair.

    Reads the local before.jpg + after.jpg from test_images/{preset_id}/
    and runs the full pixel-level change detection engine.
    Returns the same response format as POST /api/v1/analyze/before-after.
    """
    if preset_id not in PRESET_CATALOG:
        raise HTTPException(404, f"Unknown preset: {preset_id}")

    folder = TEST_IMAGES_DIR / preset_id
    before_path = folder / "before.jpg"
    after_path = folder / "after.jpg"

    if not before_path.exists() or not after_path.exists():
        raise HTTPException(
            404,
            f"Images not found for preset '{preset_id}'. "
            f"Expected: {before_path} and {after_path}",
        )

    before_bytes = before_path.read_bytes()
    after_bytes = after_path.read_bytes()

    result = inference_engine.predict_change(before_bytes, after_bytes)

    # Enrich with preset metadata
    meta = PRESET_CATALOG[preset_id]
    result["presetId"] = preset_id
    result["presetName"] = meta["name"]
    result["location"] = meta["location"]
    result["state"] = meta["state"]
    result["corridor"] = meta["corridor"]
    result["coordinates"] = {"lat": meta["lat"], "lng": meta["lng"]}
    result["beforeDate"] = meta["before_date"]
    result["afterDate"] = meta["after_date"]
    result["satellite"] = meta["satellite"]
    result["gsd"] = meta["gsd"]
    result["beforeNdvi"] = meta["before_ndvi"]
    result["afterNdvi"] = meta["after_ndvi"]
    result["beforeCatalogId"] = meta["before_catalog_id"]
    result["afterCatalogId"] = meta["after_catalog_id"]

    logger.info(
        "Preset analysis complete: %s | event=%s | change=%.1f%%",
        preset_id,
        result.get("event", {}).get("type", "unknown"),
        result.get("changePercentage", 0),
    )

    return result


# ── Main ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
