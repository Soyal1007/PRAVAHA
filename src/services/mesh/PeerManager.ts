// Peer Manager for Nearby Mesh Device Tracking

import { MeshNode, MeshDeviceRole, MeshNodeStatus } from './meshTypes';

export class PeerManager {
  private peers: Map<string, MeshNode> = new Map();

  constructor() {
    this.seedDefaultPeers();
  }

  private seedDefaultPeers() {
    const defaultPeers: MeshNode[] = [
      {
        nodeId: 'PRV-NODE-B82A',
        deviceName: 'Field Officer Patrol-B (Android)',
        deviceType: 'Android Smartphone',
        role: 'FIELD_OFFICER',
        status: 'TRUSTED',
        lastSeen: 'Just now',
        capabilities: ['BLE', 'WiFi-Direct'],
        connectionState: 'CONNECTED',
        batteryLevel: 88,
        signalStrength: 'Strong',
        rssi: -52,
        pendingQueueSize: 2,
      },
      {
        nodeId: 'PRV-NODE-C17F',
        deviceName: 'Convoy Relay Vehicle-04',
        deviceType: 'In-Cab Unit',
        role: 'RELAY',
        status: 'TRUSTED',
        lastSeen: '1 min ago',
        capabilities: ['BLE', 'WiFi-Direct', 'Gateway'],
        connectionState: 'CONNECTED',
        batteryLevel: 95,
        signalStrength: 'Medium',
        rssi: -68,
        pendingQueueSize: 0,
      },
      {
        nodeId: 'PRV-NODE-GATEWAY-01',
        deviceName: 'Regional Command Mobile Gateway',
        deviceType: 'Supervisor Terminal',
        role: 'GATEWAY',
        status: 'TRUSTED',
        lastSeen: '3 mins ago',
        capabilities: ['BLE', 'WiFi-Direct', 'Cellular Gateway'],
        connectionState: 'CONNECTED',
        batteryLevel: 100,
        signalStrength: 'Strong',
        rssi: -45,
        pendingQueueSize: 0,
      },
    ];

    defaultPeers.forEach(p => this.peers.set(p.nodeId, p));
  }

  getPeers(): MeshNode[] {
    return Array.from(this.peers.values());
  }

  getConnectedPeers(): MeshNode[] {
    return this.getPeers().filter(p => p.connectionState === 'CONNECTED');
  }

  getGatewayPeers(): MeshNode[] {
    return this.getPeers().filter(p => p.role === 'GATEWAY' && p.connectionState === 'CONNECTED');
  }

  updatePeer(nodeId: string, update: Partial<MeshNode>): MeshNode {
    const existing = this.peers.get(nodeId);
    const updatedNode: MeshNode = existing
      ? { ...existing, ...update, lastSeen: 'Just now' }
      : {
          nodeId,
          deviceName: update.deviceName || `PRAVAHA Mesh Node (${nodeId})`,
          deviceType: update.deviceType || 'Android Smartphone',
          role: update.role || 'RELAY',
          status: update.status || 'PROVISIONED',
          lastSeen: 'Just now',
          capabilities: update.capabilities || ['BLE'],
          connectionState: update.connectionState || 'CONNECTED',
          batteryLevel: update.batteryLevel || 85,
          signalStrength: update.signalStrength || 'Medium',
          rssi: update.rssi || -60,
          pendingQueueSize: update.pendingQueueSize || 0,
          ...update,
        };

    this.peers.set(nodeId, updatedNode);
    return updatedNode;
  }

  removePeer(nodeId: string): void {
    this.peers.delete(nodeId);
  }

  clearPeers(): void {
    this.peers.clear();
  }
}
