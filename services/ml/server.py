"""PRAVAHA ML Service Server.

Provides a production FastAPI layer for:
1. PravahaDisruptionRiskModel (Tabular disruption risk model)
2. NER-SHIELD Satellite Earth Intelligence Engine (Pixel-level change & disaster analysis)
"""

from __future__ import annotations

import sys
import time
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure ML package imports work
ML_DIR = Path(__file__).resolve().parent
AI_MODEL_BACKEND = ML_DIR / "ai model" / "backend"

if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))
if str(AI_MODEL_BACKEND) not in sys.path:
    sys.path.insert(0, str(AI_MODEL_BACKEND))

from risk_model import PravahaDisruptionRiskModel
try:
    from inference import inference_engine
except ImportError:
    inference_engine = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("pravaha-ml-service")

START_TIME = time.time()
risk_model_instance = PravahaDisruptionRiskModel()

app = FastAPI(
    title="PRAVAHA ML Intelligence Service",
    version="1.0.0",
    description="Production ML service integrating Disruption Risk Scoring & Satellite Earth Intelligence for PRAVAHA.",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ─────────────────────────────────────────────────────────

class RiskPredictionRequest(BaseModel):
    rainfall_24h_mm: float = Field(..., ge=0.0, description="24-hour accumulated rainfall in mm")
    rainfall_72h_mm: float = Field(0.0, ge=0.0, description="72-hour accumulated rainfall in mm")
    slope_degrees: float = Field(..., ge=0.0, le=90.0, description="Terrain slope angle in degrees")
    elevation_m: float = Field(0.0, description="Terrain elevation above sea level in meters")
    distance_to_river_m: float = Field(1000.0, ge=0.0, description="Proximity to nearest river channel in meters")
    terrain_susceptibility: float = Field(0.5, ge=0.0, le=1.0, description="NESDR baseline susceptibility index (0.0-1.0)")
    satellite_change_score: float = Field(0.0, ge=0.0, le=1.0, description="Satellite change detection score (0.0-1.0)")
    historical_incidents_count: int = Field(0, ge=0, description="Historical disruption incident count")
    road_condition_score: float = Field(0.8, ge=0.0, le=1.0, description="Pavement quality index (0.0-1.0)")
    gps_speed_anomaly_ratio: float = Field(0.0, ge=0.0, le=1.0, description="Fleet speed drop ratio (0.0-1.0)")
    latitude: Optional[float] = Field(None, description="Optional latitude for geospatial logging")
    longitude: Optional[float] = Field(None, description="Optional longitude for geospatial logging")


class RiskPredictionResponse(BaseModel):
    prediction_id: str
    prediction: Dict[str, Any]
    confidence: float
    risk_level: str
    risk_score: int
    model_name: str
    model_version: str
    timestamp: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ── Health & Version Endpoints ─────────────────────────────────────

@app.get("/api/v1/ml/health", tags=["System"])
async def health_check():
    """Health check endpoint for ML model service."""
    return {
        "status": "healthy",
        "service": "PRAVAHA ML Intelligence",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "models": {
            "disruption_risk_model": {
                "loaded": True,
                "version": "1.0.0",
                "type": "Tabular Feature-Weighted Risk Engine",
            },
            "satellite_earth_intelligence": {
                "loaded": inference_engine is not None,
                "version": "2.0.0",
                "type": "OpenCV + NumPy Pixel Analysis & PyTorch Architectures",
            },
        },
    }


@app.get("/api/v1/ml/version", tags=["System"])
async def version_info():
    """Version metadata endpoint."""
    return {
        "service_name": "PRAVAHA ML Service",
        "service_version": "1.0.0",
        "models": [
            {
                "name": "PravahaDisruptionRiskModel",
                "version": "1.0.0",
                "features_count": len(risk_model_instance.feature_names),
                "features": risk_model_instance.feature_names,
            },
            {
                "name": "NER-SHIELD Satellite Earth Intelligence Engine",
                "version": "2.0.0",
                "capabilities": ["Single Image Disaster Classification", "Pairwise Change Detection", "NDVI Mapping", "Anomaly Heatmap"],
            },
        ],
    }


# ── Prediction API ──────────────────────────────────────────────────

@app.post("/api/v1/ml/predict", response_model=RiskPredictionResponse, tags=["Inference"])
async def predict_disruption_risk(payload: RiskPredictionRequest):
    """Run disruption risk model inference on tabular telemetry and GIS features."""
    try:
        features_dict = payload.model_dump()
        result = risk_model_instance.predict_risk(features_dict)

        prediction_id = f"PRED-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.now(timezone.utc).isoformat()

        return RiskPredictionResponse(
            prediction_id=prediction_id,
            prediction=result,
            confidence=result["probability"],
            risk_level=result["risk_level"],
            risk_score=result["risk_score"],
            model_name="PravahaDisruptionRiskModel",
            model_version="1.0.0",
            timestamp=timestamp,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
    except Exception as e:
        logger.error("Error during risk model prediction: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


# ── Satellite Image Analysis Endpoints ──────────────────────────────

TEST_IMAGES_DIR = Path(__file__).resolve().parent / "ai model" / "test_images"

from fastapi.responses import FileResponse

@app.get("/api/v1/presets/{preset_id}/image/{which}", tags=["Satellite Earth Intelligence"])
@app.get("/api/v1/ml/presets/{preset_id}/image/{which}", tags=["Satellite Earth Intelligence"])
async def get_preset_image(preset_id: str, which: str):
    """Serve before/after preset satellite test images."""
    if which not in ("before", "after"):
        raise HTTPException(status_code=400, detail="Image type must be 'before' or 'after'")
    
    file_path = TEST_IMAGES_DIR / preset_id / f"{which}.jpg"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Preset image not found: {preset_id}/{which}")
    
    return FileResponse(file_path, media_type="image/jpeg")


@app.post("/api/v1/analyze/preset/{preset_id}", tags=["Satellite Earth Intelligence"])
@app.post("/api/v1/ml/analyze/preset/{preset_id}", tags=["Satellite Earth Intelligence"])
async def analyze_preset(preset_id: str):
    """Run real OpenCV change detection on a named preset test image pair."""
    preset_dir = TEST_IMAGES_DIR / preset_id
    before_path = preset_dir / "before.jpg"
    after_path = preset_dir / "after.jpg"
    
    if not before_path.exists() or not after_path.exists():
        raise HTTPException(status_code=404, detail=f"Preset images missing for '{preset_id}'")

    if not inference_engine:
        raise HTTPException(status_code=503, detail="Satellite Earth Intelligence engine unavailable.")

    with open(before_path, "rb") as f:
        before_bytes = f.read()
    with open(after_path, "rb") as f:
        after_bytes = f.read()

    result = inference_engine.predict_change(before_bytes, after_bytes)
    return result


@app.post("/api/v1/ml/analyze/single", tags=["Satellite Earth Intelligence"])
@app.post("/api/v1/analyze/single", tags=["Satellite Earth Intelligence"])
async def analyze_single_image(file: UploadFile = File(...)):
    """Analyze a single satellite image for disaster classification and anomaly detection."""
    if not inference_engine:
        raise HTTPException(status_code=503, detail="Satellite Earth Intelligence engine unavailable.")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file filename provided.")

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds maximum size of 20MB.")

    result = inference_engine.predict_single(contents, file.filename)
    return {
        "status": "success",
        "model_name": "NER-SHIELD Satellite Earth Intelligence Engine",
        "model_version": "2.0.0",
        "result": result,
    }


@app.post("/api/v1/ml/analyze/before-after", tags=["Satellite Earth Intelligence"])
@app.post("/api/v1/analyze/before-after", tags=["Satellite Earth Intelligence"])
async def analyze_before_after(
    before: UploadFile = File(...),
    after: UploadFile = File(...),
):
    """Run change detection on a pair of before/after satellite images."""
    if not inference_engine:
        raise HTTPException(status_code=503, detail="Satellite Earth Intelligence engine unavailable.")

    before_bytes = await before.read()
    after_bytes = await after.read()

    result = inference_engine.predict_change(before_bytes, after_bytes)
    return {
        "status": "success",
        "model_name": "NER-SHIELD Satellite Earth Intelligence Engine",
        "model_version": "2.0.0",
        "result": result,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

