from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Alert

router = APIRouter(prefix="/alerts", tags=["AlertNet"])

@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    if not alerts:
        return [
            {
                "id": "alt_01",
                "title": "CRITICAL: NH-10 Landslide Debris Blockage",
                "severity": "CRITICAL",
                "category": "DISRUPTION",
                "message": "Both lanes blocked near Melli. RouteGuard rerouting active.",
                "road_name": "NH-10",
                "acknowledged": False,
                "created_at": "2026-09-17T08:30:00Z"
            },
            {
                "id": "alt_02",
                "title": "HIGH: Kaziranga NH-27 Flood Inundation Alert",
                "severity": "HIGH",
                "category": "WEATHER",
                "message": "Heavy monsoon rainfall triggered 0.6m water logging.",
                "road_name": "NH-27",
                "acknowledged": False,
                "created_at": "2026-09-17T07:15:00Z"
            }
        ]
    return alerts
