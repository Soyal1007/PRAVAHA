import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="FIELD_OFFICER") # LOGISTICS_ADMIN, OPERATOR, DRIVER, AUTHORITY
    organization = Column(String, default="NDRF / Assam Logistics")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Road(Base):
    __tablename__ = "roads"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True, nullable=False) # e.g. NH-10, NH-27
    state = Column(String, nullable=False) # Assam, Meghalaya, Sikkim, etc.
    district = Column(String, nullable=False)
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lng = Column(Float, nullable=False)
    status = Column(String, default="OPEN") # OPEN, RESTRICTED, BLOCKED
    risk_score = Column(Integer, default=15)
    terrain_slope = Column(Float, default=12.5) # degrees

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, default=generate_uuid)
    plate_number = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(String, default="Truck 10-Ton")
    driver_name = Column(String, nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    status = Column(String, default="MOVING") # MOVING, STOPPED, DELAYED, OFF_ROUTE, OFFLINE
    last_updated = Column(DateTime, default=datetime.utcnow)

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    capacity_tons = Column(Float, default=500.0)
    current_stock_tons = Column(Float, default=320.0)
    stock_status = Column(String, default="NORMAL") # NORMAL, LOW, CRITICAL

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True, default=generate_uuid)
    tracking_code = Column(String, unique=True, index=True, nullable=False)
    origin_warehouse_id = Column(String, ForeignKey("warehouses.id"))
    destination_name = Column(String, nullable=False)
    commodity_type = Column(String, nullable=False) # Medicine, Food Supplies, Relief Equipment
    weight_tons = Column(Float, default=5.0)
    priority = Column(String, default="HIGH") # CRITICAL, HIGH, NORMAL
    status = Column(String, default="IN_TRANSIT") # PENDING, IN_TRANSIT, DELIVERED, REROUTED
    assigned_vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=True)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    incident_type = Column(String, nullable=False) # LANDSLIDE, FLOOD, ROAD_BLOCK, BRIDGE_DAMAGE
    severity = Column(String, default="HIGH") # CRITICAL, HIGH, MODERATE, LOW
    status = Column(String, default="VERIFIED") # DETECTED, UNDER_REVIEW, VERIFIED, RESOLVED
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    road_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    reported_by_node = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    report_code = Column(String, unique=True, index=True)
    officer_name = Column(String, nullable=False)
    incident_type = Column(String, nullable=False)
    severity = Column(String, default="HIGH")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    sync_status = Column(String, default="SYNCED") # LOCAL_ONLY, OUTBOX, SYNCED
    mesh_origin_node = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    severity = Column(String, default="HIGH") # CRITICAL, HIGH, MODERATE, LOW
    category = Column(String, default="DISRUPTION") # DISRUPTION, WEATHER, MESH, SATELLITE
    message = Column(Text, nullable=False)
    road_name = Column(String, nullable=True)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"

    id = Column(String, primary_key=True, default=generate_uuid)
    satellite_name = Column(String, nullable=False) # Sentinel-1, Sentinel-2, MOSDAC
    scene_id = Column(String, nullable=False)
    acquisition_date = Column(String, nullable=False)
    change_detected = Column(Boolean, default=False)
    change_score = Column(Float, default=0.0) # 0.0 to 1.0
    description = Column(Text, nullable=True)
    aoi_name = Column(String, nullable=False)

class MeshMessage(Base):
    __tablename__ = "mesh_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, unique=True, index=True, nullable=False)
    origin_node_id = Column(String, nullable=False)
    sender_node_id = Column(String, nullable=False)
    msg_type = Column(String, nullable=False)
    priority = Column(String, default="HIGH")
    ttl = Column(Integer, default=5)
    hop_count = Column(Integer, default=0)
    payload_json = Column(JSON, nullable=False)
    synced_at = Column(DateTime, default=datetime.utcnow)
