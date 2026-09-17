from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "FIELD_OFFICER"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class IncidentCreate(BaseModel):
    title: str
    incident_type: str
    severity: str = "HIGH"
    lat: float
    lng: float
    road_name: str
    description: Optional[str] = None
    reported_by_node: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    title: str
    incident_type: str
    severity: str
    status: str
    lat: float
    lng: float
    road_name: str
    description: Optional[str]
    created_at: datetime

class RouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    vehicle_type: Optional[str] = "Truck 10-Ton"
    cargo_priority: Optional[str] = "HIGH"

class RouteResponse(BaseModel):
    route_id: str
    distance_km: float
    estimated_time_mins: float
    base_time_mins: float
    pravaha_risk_score: float
    risk_level: str
    contributing_factors: List[str]
    waypoints: List[Dict[str, float]]

class RiskCalculateRequest(BaseModel):
    lat: float
    lng: float
    road_name: Optional[str] = "NH-10"
    rainfall_24h_mm: Optional[float] = 45.0
    slope_degrees: Optional[float] = 18.5

class RiskCalculateResponse(BaseModel):
    risk_score: int
    risk_level: str
    contributing_factors: List[str]
    recommendation: str

class MeshSyncPayload(BaseModel):
    message_id: str
    origin_node_id: str
    sender_node_id: str
    type: str
    priority: str
    ttl: int
    hop_count: int
    payload: Dict[str, Any]
