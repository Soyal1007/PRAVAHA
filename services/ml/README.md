# PRAVAHA ML Intelligence Service

Production ML Service for the PRAVAHA Disruption & Earth Intelligence System.

## Architecture Overview

```
PRAVAHA Frontend (React / Vite)
       ↓
PRAVAHA Backend ML Service API (FastAPI - http://localhost:8000/api/v1/ml)
       ↓
 ┌───────────────────────────────────────────────┐
 │               TRAINED ML MODELS               │
 ├────────────────────────┬──────────────────────┤
 │ Disruption Risk Model  │ Earth Intelligence   │
 │ (risk_model.py)        │ (OpenCV + PyTorch)   │
 └────────────────────────┴──────────────────────┘
       ↓                           ↓
  Predict Score              Satellite Analysis
       └────────────┬──────────────┘
                    ↓
          PRAVAHA Risk Engine
                    ↓
    RouteGuard / AlertNet / Command Center
```

---

## Models Included

### 1. Disruption Risk Model (`risk_model.py`)
- **Model Name**: `PravahaDisruptionRiskModel`
- **Version**: `1.0.0`
- **Type**: Tabular Multi-Factor Risk Scoring Engine
- **Inputs**:
  - `rainfall_24h_mm`: 24-hour rainfall accumulation (mm)
  - `slope_degrees`: Terrain slope grade (degrees)
  - `terrain_susceptibility`: NESDR baseline susceptibility (0.0 - 1.0)
  - `satellite_change_score`: Satellite change detection index (0.0 - 1.0)
  - `gps_speed_anomaly_ratio`: Telemetry anomaly index (0.0 - 1.0)
  - Additional context: `rainfall_72h_mm`, `elevation_m`, `distance_to_river_m`, `historical_incidents_count`, `road_condition_score`.
- **Output**:
  ```json
  {
    "risk_score": 85,
    "risk_level": "CRITICAL",
    "probability": 0.85
  }
  ```

### 2. Satellite Earth Intelligence Engine (`ai model/`)
- **Model Name**: `NER-SHIELD Satellite Earth Intelligence Engine`
- **Version**: `2.0.0`
- **Type**: Computer Vision & Geospatial Analysis Engine (OpenCV + NumPy + PyTorch)
- **Capabilities**:
  - Single Satellite Image Disaster Classification & Anomaly Heatmaps
  - Pairwise Before/After Satellite Image Change Detection & NDVI Mapping
  - Multi-class Land Cover Segmentation & Event Classification

---

## Quick Start & Running the ML Service

### 1. Install Dependencies
```bash
py -3.11 -m pip install fastapi uvicorn opencv-python-headless numpy pillow pydantic pyyaml requests python-multipart
```

### 2. Start ML FastAPI Server
```bash
py -3.11 services/ml/server.py
```
Server starts on: `http://localhost:8000`
Swagger API Docs available at: `http://localhost:8000/docs`

### 3. Run Automated Tests
```bash
py -3.11 services/ml/tests/test_ml_service.py
```

---

## API Endpoints Reference

### Health & Metadata
- **GET** `/api/v1/ml/health`: Returns service health status and model versions.
- **GET** `/api/v1/ml/version`: Returns feature metadata and capability matrix.

### Inference
- **POST** `/api/v1/ml/predict`: Disruption Risk Prediction
  - Body: JSON payload of tabular GIS and telemetry features.
  - Returns prediction ID, risk score (0-100), risk level (`CRITICAL`, `HIGH`, `ELEVATED`, `LOW`), confidence, model version, and timestamp.
- **POST** `/api/v1/ml/analyze/single`: Single Satellite Image Analysis
  - Body: `multipart/form-data` with `file` upload.
- **POST** `/api/v1/ml/analyze/before-after`: Pairwise Change Detection
  - Body: `multipart/form-data` with `before` and `after` image uploads.

---

## Connection to PRAVAHA System

1. **PRAVAHA Risk Engine** (`src/services/riskEngine.ts`):
   - The ML model serves as one evidence source contributing 20% weight to the composite corridor risk score.
   - Critical decisions remain human-verifiable; the model cannot unilaterally issue public emergency alerts or permanently block roads.

2. **Frontend Client** (`src/services/mlService.ts`):
   - Automatic HTTP connection to FastAPI backend.
   - Fallback to local client-side execution using exact `PravahaDisruptionRiskModel` equation if offline.

---

## Known Limitations
- Real-time satellite revisiting depends on satellite pass schedules (Copernicus Sentinel / ISRO Bhuvan).
- Tabular model feature inputs assume standard metric units (mm for rainfall, degrees for slope).
