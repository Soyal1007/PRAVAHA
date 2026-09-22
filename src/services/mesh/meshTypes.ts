// Types for PRAVAHA Offline Resilience & Mesh Communication Module

export type MeshDeviceRole = 'FIELD_OFFICER' | 'DRIVER' | 'RELAY' | 'SUPERVISOR' | 'GATEWAY' | 'ADMIN';

export type MeshConnectionState = 'DISCONNECTED' | 'DISCOVERING' | 'CONNECTING' | 'CONNECTED' | 'ADVERTISING' | 'SYNCING';

export type MeshNodeStatus = 'TRUSTED' | 'UNTRUSTED' | 'PROVISIONED' | 'BLOCKED';

export type MeshPowerMode = 'Mesh Active' | 'Mesh Low Power' | 'Mesh Off';

export type MeshMessageType = 
  | 'FIELD_INCIDENT'
  | 'ROAD_BLOCK'
  | 'ROAD_REOPENED'
  | 'VEHICLE_STATUS'
  | 'SHIPMENT_UPDATE'
  | 'EMERGENCY_ALERT'
  | 'GPS_UPDATE'
  | 'SYNC_REQUEST'
  | 'SYNC_RESPONSE'
  | 'ACKNOWLEDGEMENT'
  | 'HEARTBEAT';

export type MeshMessagePriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type MeshDeliveryState = 
  | 'CREATED'
  | 'QUEUED'
  | 'DISCOVERED'
  | 'TRANSFERRED'
  | 'RELAYED'
  | 'RECEIVED'
  | 'SYNC_PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'EXPIRED';

export interface MeshNode {
  nodeId: string; // e.g. "PRV-NODE-A8F31"
  deviceName: string;
  deviceType: 'Android Smartphone' | 'Relay Beacon' | 'In-Cab Unit' | 'Supervisor Terminal';
  role: MeshDeviceRole;
  status: MeshNodeStatus;
  lastSeen: string;
  capabilities: string[]; // ['BLE', 'WiFi-Direct', 'Gateway']
  connectionState: MeshConnectionState;
  batteryLevel: number; // 0 - 100
  signalStrength: 'Strong' | 'Medium' | 'Weak' | 'Offline';
  rssi: number; // e.g. -54 dBm
  ipOrAddress?: string;
  pendingQueueSize: number;
}

export type PackageVerificationStatus = 'Pending Verification' | 'Verified & Admitted' | 'Rejected';

export interface MeshIncidentPayload {
  incidentType: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  road: string;
  locationName?: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  description: string;
  reporterName?: string;
  reporterRole?: string;
  photoUrl?: string;
  sentTimestamp?: string;
  sentPlace?: string;
  verificationStatus?: PackageVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface MeshMessage {
  messageId: string; // e.g. "PRV-MSG-8F3A91"
  type: MeshMessageType;
  originNodeId: string;
  createdAt: string;
  ttl: number; // Initial 5
  hopCount: number; // Increment each hop
  priority: MeshMessagePriority;
  payload: MeshIncidentPayload | Record<string, any>;
  requiresCloudSync: boolean;
  deliveryState: MeshDeliveryState;
  senderNodeId?: string; // Node that sent this specific hop
  targetNodeId?: string; // Optional destination node
  signature?: string; // Message integrity signature
  syncedTimestamp?: string;
  syncedGatewayNodeId?: string;
  verificationStatus?: PackageVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  hopsHistory?: Array<{
    hopNumber: number;
    nodeId: string;
    timestamp: string;
  }>;
}

export interface MeshDiagnosticsStats {
  nodeId: string;
  role: MeshDeviceRole;
  powerMode: MeshPowerMode;
  internetConnected: boolean;
  meshActive: boolean;
  nearbyNodesCount: number;
  queueSize: number;
  messagesReceived: number;
  messagesRelayed: number;
  messagesSynced: number;
  duplicateMessagesBlocked: number;
  lastCloudSync: string | null;
  securityStatus: MeshNodeStatus;
  batteryLevel: number;
}

export interface DemoHopStep {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  activeNodeId: string;
  targetNodeId?: string;
  actionType: 'OFFLINE_CREATE' | 'DISCOVER_PEER' | 'TRANSFER_HOP' | 'RECEIVE_ACK' | 'GATEWAY_SYNC' | 'SYSTEM_ACTION';
  messageState: MeshDeliveryState;
  timestamp: string;
}
