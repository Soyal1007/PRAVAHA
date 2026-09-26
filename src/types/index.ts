// Domain Types for PRAVAHA Platform

export type UserRole = 'Logistics Administrator' | 'Admin' | 'Logistics Operator' | 'Field Officer' | 'Driver' | 'Authority Viewer';

export type NesdrDatasetClassification = 
  | 'BASELINE' 
  | 'OBSERVED' 
  | 'REAL-TIME' 
  | 'HISTORICAL' 
  | 'PREDICTIVE' 
  | 'REFERENCE';

export type NesdrDomain = 
  | 'Disaster Management' 
  | 'Terrain' 
  | 'Infrastructure' 
  | 'Water Resource' 
  | 'Land Resource' 
  | 'Administrative Boundaries'
  | 'Remote Sensing'
  | 'Meteorology';

export interface NesdrDataset {
  id: string;
  title: string;
  domain: NesdrDomain;
  classification: NesdrDatasetClassification;
  sourceAgency: string;
  sourceUrl: string;
  ogcServiceUrl: string;
  layerName: string;
  dataFormat: string;
  lastUpdated: string;
  coverage: string;
  description: string;
  relevanceToPravaha: string;
  activeOverlay: boolean;
  featuresCount: number;
  spatialBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface NesdrHazardZone {
  id: string;
  datasetId: string;
  name: string;
  type: 'Landslide Susceptibility' | 'Flood Inundation' | 'River Bank Erosion' | 'DEM Slope Gradient' | 'SISDP Highway Corridor';
  severity: RiskLevel;
  state: string;
  district: string;
  affectedCorridors: string[];
  coordinates: Array<{ lat: number; lng: number }>;
  sourceInfo: {
    agency: string;
    datasetTitle: string;
    updatedDate: string;
    classification: NesdrDatasetClassification;
    ogcUrl: string;
  };
  susceptibilityScore: number; // 0 - 100
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  state: string;
  district?: string;
  avatarUrl?: string;
}

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type RoadStatus = 'Open' | 'Restricted' | 'Blocked' | 'Under Maintenance';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  name: string;
}

export interface RoadSegment {
  id: string;
  roadName: string; // e.g. "NH-10 (Siliguri - Gangtok)"
  state: string;
  district: string;
  startPoint: LocationCoordinates;
  endPoint: LocationCoordinates;
  status: RoadStatus;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  roadClass: 'National Highway' | 'State Highway' | 'District Road' | 'Border Road';
  lastUpdated: string;
  causeOfDisruption?: string;
}

export type VehicleStatus = 'In Transit' | 'Delayed' | 'At Risk' | 'Idle' | 'Offline' | 'Arrived';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string; // e.g. "AS-01-AB-7821"
  vehicleType: 'Heavy Truck' | 'Medium Truck' | 'Emergency Vehicle' | 'Light Cargo';
  driver: Driver;
  currentLocation: LocationCoordinates;
  speedKmH: number;
  headingDegrees: number;
  gpsStatus: 'Online' | 'Offline' | 'Weak Signal' | 'Anomaly';
  status: VehicleStatus;
  assignedShipmentId?: string;
  assignedRouteId?: string;
  riskLevel: RiskLevel;
  lastGpsTimestamp: string;
  speedHistory: { time: string; speed: number }[];
}

export type CommodityCategory = 'Medicines' | 'Food' | 'Construction Materials' | 'Agricultural Inputs' | 'Fuel' | 'Disaster Relief Supplies';

export type PriorityLevel = 'Standard' | 'High' | 'Urgent' | 'Critical';

export interface Shipment {
  id: string;
  trackingCode: string; // e.g. "PRV-2048"
  title: string;
  category: CommodityCategory;
  quantityUnits: number;
  unitType: string; // e.g. "Boxes", "Tons", "Kits"
  origin: LocationCoordinates;
  destination: LocationCoordinates;
  vehicleId: string;
  priority: PriorityLevel;
  status: 'Scheduled' | 'In Transit' | 'Rerouted' | 'Delayed' | 'Delivered' | 'Critical Risk';
  departureTime: string;
  originalEta: string;
  currentEta: string;
  activeRouteId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  notes?: string;
  state: string;
  district: string;
}

export interface RouteOption {
  id: string;
  name: string; // e.g. "Primary Corridor (NH-10)"
  type: 'Recommended' | 'Fastest' | 'Safer Alternate';
  distanceKm: number;
  estimatedDurationHours: number;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  roadSegments: string[]; // segment ids
  waypoints: LocationCoordinates[];
  recommendationReason: string;
  weatherExposure: string;
  incidentExposureCount: number;
}

export interface Route {
  id: string;
  shipmentId: string;
  originName: string;
  destinationName: string;
  activeOptionId: string;
  options: RouteOption[];
}

export type IncidentType = 'Landslide' | 'Flood' | 'Road Damage' | 'Bridge Damage' | 'Traffic' | 'Vehicle Breakdown' | 'Other';

export type IncidentStatus = 'Pending Sync' | 'Submitted' | 'Under Review' | 'Verified' | 'Active' | 'Resolved';

export type VerificationSource = 
  | 'Satellite Radar (Sentinel-1)'
  | 'IoT Water Level Sensor #402'
  | 'Central Water Commission (CWC)'
  | 'n8n Voice Call IVR'
  | 'Field Officer Ground Check'
  | 'Crowdsourced Citizen Report'
  | 'Government Source'
  | 'Field Report'
  | 'GPS Signal'
  | 'Weather Feed'
  | 'System Estimate';

export type VerificationStatus = 
  | 'True Alarm (Verified)'
  | 'False Alarm (Disproven)'
  | 'Unverified (Pending Inspection)';

export interface FieldReport {
  id: string;
  incidentType: IncidentType;
  location: LocationCoordinates;
  state: string;
  district: string;
  roadName: string;
  severity: RiskLevel;
  description: string;
  photoUrl?: string;
  reporterName: string;
  reporterRole: string;
  timestamp: string;
  status: IncidentStatus;
  affectedVehicleIds: string[];
  affectedShipmentIds: string[];
  verificationSource: VerificationSource;
  confidenceScore: number; // 0 - 100%
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedTimestamp?: string;
  verificationNotes?: string;
  crossValidationSourcesCount?: number;
}

export interface Incident extends FieldReport {}

export interface CallRegistration {
  id: string;
  phoneNumber: string;
  callerName: string;
  language: string;
  district: string;
  state: string;
  requestedRole: 'Volunteer' | 'Emergency Rescue Driver' | 'Field Relief Agent' | 'Citizen Reporter';
  callDurationSec: number;
  audioTranscript: string;
  status: 'Pending Approval' | 'Approved' | 'Flagged for Verification' | 'Rejected';
  verifiedStatus: 'True Identity' | 'False Alarm / Spam' | 'Pending Call-Back';
  n8nWorkflowId: string;
  timestamp: string;
  extractedData?: {
    equipment?: string;
    availability?: string;
    notes?: string;
  };
}

export interface WeatherEvent {
  id: string;
  locationName: string;
  state: string;
  coordinates: LocationCoordinates;
  condition: 'Clear' | 'Light Rain' | 'Heavy Rain' | 'Torrential Downpour' | 'Dense Fog' | 'Flash Flood Warning';
  rainfallMmHr: number;
  windSpeedKmH: number;
  visibilityMeters: number;
  floodRisk: 'Low' | 'Moderate' | 'High' | 'Extreme';
  forecast24h: string;
  affectedCorridors: string[];
  timestamp: string;
}

export interface RiskEvent {
  id: string;
  corridorName: string;
  state: string;
  district: string;
  overallScore: number; // 0-100
  riskLevel: RiskLevel;
  factors: {
    terrainSusceptibility: number;
    rainfall: number;
    forecastRainfall: number;
    floodProximity: number;
    historicalIncidents: number;
    roadCondition: number;
    gpsAnomalies: number;
  };
  reasons: string[];
  timestamp: string;
}

export interface Warehouse {
  id: string;
  name: string; // e.g. "Imphal Regional Depot"
  state: string;
  district: string;
  location: LocationCoordinates;
  category: CommodityCategory;
  availableStock: number;
  demandedStock: number;
  unitType: string;
  daysRemaining: number;
  incomingShipmentsCount: number;
  riskLevel: RiskLevel;
  contactNumber: string;
}

export interface Hospital {
  id: string;
  name: string; // e.g. "RIMS Hospital Imphal"
  state: string;
  district: string;
  location: LocationCoordinates;
  bedCapacity: number;
  icuAvailable: number;
  medicalSupplyStockLevel: number; // %
  emergencyAccessStatus: 'Clear' | 'Restricted' | 'Cut Off';
}

export type AlertSeverity = 'Critical' | 'Warning' | 'Information' | 'Resolved';

export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  category: 'Disruption' | 'GPS Anomaly' | 'Weather' | 'Supply Shortage' | 'System';
  corridorOrLocation: string;
  description: string;
  affectedShipmentsCount: number;
  affectedVehiclesCount: number;
  estimatedDelayMinutes: number;
  timestamp: string;
  acknowledged: boolean;
  relatedShipmentId?: string;
  relatedVehicleId?: string;
  relatedIncidentId?: string;
  actions: ('Reroute Shipments' | 'Notify Drivers' | 'Notify Authority' | 'Acknowledge')[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'Critical' | 'Operations' | 'System';
  read: boolean;
  actionPath?: string;
}

export interface GPSUpdate {
  vehicleId: string;
  lat: number;
  lng: number;
  speedKmH: number;
  heading: number;
  timestamp: string;
}

export interface ETAUpdate {
  shipmentId: string;
  previousEta: string;
  newEta: string;
  delayMinutes: number;
  reason: string;
  timestamp: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  eventType: string;
  description: string;
  actor: string;
  source: 'Simulated Engine' | 'Field Agent' | 'Logistics Admin' | 'System Watchdog';
}

export interface ReportFilter {
  dateRange: string;
  state: string;
  district: string;
  category: string;
  riskLevel: string;
}
