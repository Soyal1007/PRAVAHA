from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter(prefix="/satellite", tags=["Earth Intelligence"])

@router.get("/change-detection")
def get_change_detection_analysis(aoi: str = "Teesta Valley / NH-10 Corridor"):
    return {
        "aoi": aoi,
        "satellites": ["Sentinel-1 SAR", "Sentinel-2 MSI", "MOSDAC"],
        "pre_event": {
            "date": "2026-08-15",
            "scene_id": "S1A_IW_GRDH_1SDV_20260815T121044",
            "ndvi_mean": 0.72,
            "ndwi_mean": 0.15
        },
        "post_event": {
            "date": "2026-09-12",
            "scene_id": "S1A_IW_GRDH_1SDV_20260912T121044",
            "ndvi_mean": 0.41,
            "ndwi_mean": 0.38
        },
        "change_detection": {
            "method": "Bands Differential & SAR Backscatter Ratio (VV/VH)",
            "surface_change_detected": True,
            "confidence_score": 0.89,
            "affected_area_sq_m": 45200,
            "classification": "Landslide Debris Flow & River Bank Erosion"
        }
    }
