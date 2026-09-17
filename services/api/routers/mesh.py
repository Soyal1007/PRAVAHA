from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MeshMessage, Incident, Alert
from ..schemas import MeshSyncPayload
from datetime import datetime

router = APIRouter(prefix="/mesh", tags=["Mesh Gateway Sync"])

@router.post("/sync")
def sync_mesh_packet(payload: MeshSyncPayload, db: Session = Depends(get_db)):
    # Check if already synced to avoid duplicate API processing
    existing = db.query(MeshMessage).filter(MeshMessage.messageId == payload.message_id).first()
    if existing:
        return {"status": "ALREADY_SYNCED", "message_id": payload.message_id}

    # Store mesh message record
    msg = MeshMessage(
        messageId=payload.message_id,
        origin_node_id=payload.origin_node_id,
        sender_node_id=payload.sender_node_id,
        msg_type=payload.type,
        priority=payload.priority,
        ttl=payload.ttl,
        hop_count=payload.hop_count,
        payload_json=payload.payload
    )
    db.add(msg)

    # If payload contains a FIELD_INCIDENT, automatically register it as a central Incident
    if payload.type == "FIELD_INCIDENT" and isinstance(payload.payload, dict):
        p = payload.payload
        inc = Incident(
            title=f"Offline Report: {p.get('incidentType', 'Incident')} near {p.get('locationName', 'NER Highway')}",
            incident_type=p.get('incidentType', 'LANDSLIDE'),
            severity=payload.priority,
            status="VERIFIED",
            lat=p.get('latitude', 27.1425),
            lng=p.get('longitude', 88.4231),
            road_name=p.get('locationName', 'NH-10 Corridor'),
            description=p.get('description', 'Reported via offline store-and-forward mesh packet.'),
            reported_by_node=payload.origin_node_id
        )
        db.add(inc)

        # Create alert
        alert = Alert(
            title=f"OFFLINE MESH GATEWAY SYNC: {p.get('incidentType', 'Incident')}",
            severity=payload.priority,
            category="MESH",
            message=f"Synced from mesh gateway node {payload.sender_node_id} (Origin: {payload.origin_node_id}, Hops: {payload.hop_count}).",
            road_name=p.get('locationName', 'NH-10')
        )
        db.add(alert)

    db.commit()
    return {
        "status": "SYNCED",
        "ack_id": f"ACK-{payload.message_id}",
        "timestamp": datetime.utcnow().isoformat()
    }
