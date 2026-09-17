from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Incident, Alert
from ..schemas import IncidentCreate, IncidentResponse
from datetime import datetime

router = APIRouter(prefix="/incidents", tags=["Incidents & Field Reports"])

@router.get("/", response_model=List[IncidentResponse])
def get_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    if not incidents:
        # Seed initial NER demo incidents
        demo_incidents = [
            Incident(
                id="inc_01",
                title="Landslide on NH-10 near Melli",
                incident_type="LANDSLIDE",
                severity="CRITICAL",
                status="VERIFIED",
                lat=27.1425,
                lng=88.4231,
                road_name="NH-10 (Siliguri-Gangtok Corridor)",
                description="Heavy debris blocking both lanes of NH-10. RouteGuard re-routing dispatched vehicles via Kalimpong bypass.",
                reported_by_node="PRV-FIELD-NODE-A"
            ),
            Incident(
                id="inc_02",
                title="Flash Flood Submergence on NH-27",
                incident_type="FLOOD",
                severity="HIGH",
                status="VERIFIED",
                lat=26.1821,
                lng=91.7485,
                road_name="NH-27 (Guwahati Highway)",
                description="Water accumulation 0.6m deep near Kaziranga segment.",
                reported_by_node="PRV-FIELD-NODE-B"
            )
        ]
        return demo_incidents
    return incidents

@router.post("/", response_model=IncidentResponse)
def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    inc = Incident(
        title=incident_in.title,
        incident_type=incident_in.incident_type,
        severity=incident_in.severity,
        lat=incident_in.lat,
        lng=incident_in.lng,
        road_name=incident_in.road_name,
        description=incident_in.description,
        reported_by_node=incident_in.reported_by_node
    )
    db.add(inc)

    # Automatically generate an alert for Command Center & Field Officers
    alert = Alert(
        title=f"CRITICAL: {incident_in.incident_type} reported on {incident_in.road_name}",
        severity=incident_in.severity,
        category="DISRUPTION",
        message=incident_in.description or f"New {incident_in.incident_type} incident reported at ({incident_in.lat}, {incident_in.lng}).",
        road_name=incident_in.road_name
    )
    db.add(alert)
    db.commit()
    db.refresh(inc)
    return inc
