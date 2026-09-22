// Central Mesh Manager Coordinator for PRAVAHA Offline Resilience Module

import {
  MeshNode,
  MeshMessage,
  MeshPowerMode,
  MeshDiagnosticsStats,
  MeshDeliveryState,
  MeshIncidentPayload,
  DemoHopStep,
} from './meshTypes';
import { MessageCache } from './MessageCache';
import { SecurityManager } from './SecurityManager';
import { OfflineQueue } from './OfflineQueue';
import { PeerManager } from './PeerManager';
import { TransportManager } from './TransportManager';
import { SyncManager } from './SyncManager';
import { meshEventBus } from './MeshEventBus';

import { indexedDBStorage } from './IndexedDBStorage';

export class MeshManager {
  private static instance: MeshManager;

  public localNode: MeshNode;
  public powerMode: MeshPowerMode = 'Mesh Active';
  public messageCache: MessageCache;
  public securityManager: SecurityManager;
  public offlineQueue: OfflineQueue;
  public peerManager: PeerManager;
  public transportManager: TransportManager;
  public syncManager: SyncManager;

  // Stats
  public stats: {
    messagesReceived: number;
    messagesRelayed: number;
    messagesSynced: number;
    duplicateBlocked: number;
    lastSyncTimestamp: string | null;
  } = {
    messagesReceived: 0,
    messagesRelayed: 0,
    messagesSynced: 0,
    duplicateBlocked: 0,
    lastSyncTimestamp: null,
  };

  private constructor() {
    // Generate or load local node identity
    const savedNodeId = localStorage.getItem('pravaha_mesh_node_id') || `PRV-NODE-${Math.floor(10000 + Math.random() * 90000).toString(16).toUpperCase()}`;
    localStorage.setItem('pravaha_mesh_node_id', savedNodeId);

    this.localNode = {
      nodeId: savedNodeId,
      deviceName: `Field Node (${savedNodeId})`,
      deviceType: 'Android Smartphone',
      role: 'FIELD_OFFICER',
      status: 'TRUSTED',
      lastSeen: 'Active Now',
      capabilities: ['BLE', 'WebRTC-DataChannel', 'Store-and-Forward'],
      connectionState: 'CONNECTED',
      batteryLevel: 92,
      signalStrength: 'Strong',
      rssi: -40,
      pendingQueueSize: 0,
    };

    this.messageCache = new MessageCache();
    this.securityManager = new SecurityManager();
    this.offlineQueue = new OfflineQueue();
    this.peerManager = new PeerManager();
    this.transportManager = new TransportManager(this.localNode);
    this.syncManager = new SyncManager();

    // Bind real physical device transport callback
    this.transportManager.setIncomingMessageHandler((msg: MeshMessage) => {
      console.log(`[MeshManager] Incoming physical packet from peer: ${msg.messageId}`);
      this.processIncomingMessage(msg);
    });

    // Initialize real IndexedDB storage
    indexedDBStorage.init().then(async (available) => {
      if (available) {
        const storedMsgs = await indexedDBStorage.getAllQueueMessages();
        storedMsgs.forEach((msg) => this.offlineQueue.enqueue(msg));
        this.localNode.pendingQueueSize = this.offlineQueue.getQueueSize();
      }
    });

    this.initListeners();
  }

  public static getInstance(): MeshManager {
    if (!MeshManager.instance) {
      MeshManager.instance = new MeshManager();
    }
    return MeshManager.instance;
  }

  private initListeners() {
    meshEventBus.on('connectivityStatusChanged', ({ online }) => {
      if (online) {
        this.attemptCloudSync();
      }
    });

    meshEventBus.on('autoSyncTriggered', () => {
      this.attemptCloudSync();
    });
  }

  /**
   * Set mesh power mode ('Mesh Active', 'Mesh Low Power', 'Mesh Off')
   */
  public setPowerMode(mode: MeshPowerMode) {
    this.powerMode = mode;
    if (mode === 'Mesh Off') {
      this.localNode.connectionState = 'DISCONNECTED';
    } else {
      this.localNode.connectionState = 'CONNECTED';
    }
    meshEventBus.emit('powerModeChanged', { mode });
  }

  /**
   * Creates a new offline incident report message
   */
  public createIncidentReport(payload: MeshIncidentPayload): MeshMessage {
    const messageId = `PRV-MSG-${Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}`;

    // Sample fallback photos if user didn't attach one
    const samplePhotos: Record<string, string> = {
      Landslide: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
      Flood: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80',
      'Road Damage': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
      'Bridge Damage': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      Default: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    };

    const finalPhotoUrl =
      payload.photoUrl ||
      samplePhotos[payload.incidentType] ||
      samplePhotos['Default'];

    const formattedTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const enrichedPayload: MeshIncidentPayload = {
      ...payload,
      photoUrl: finalPhotoUrl,
      sentTimestamp: payload.sentTimestamp || formattedTime,
      sentPlace: payload.sentPlace || `${payload.road} (${payload.latitude.toFixed(4)}° N, ${payload.longitude.toFixed(4)}° E)`,
      reporterName: payload.reporterName || 'Field Officer (BLE Mesh)',
      reporterRole: payload.reporterRole || 'Field Agent',
      verificationStatus: payload.verificationStatus || 'Pending Verification',
    };

    const message: MeshMessage = {
      messageId,
      type: 'FIELD_INCIDENT',
      originNodeId: this.localNode.nodeId,
      createdAt: new Date().toISOString(),
      ttl: 5,
      hopCount: 0,
      priority: payload.severity === 'Critical' ? 'CRITICAL' : 'HIGH',
      payload: enrichedPayload,
      requiresCloudSync: true,
      deliveryState: 'CREATED',
      senderNodeId: this.localNode.nodeId,
      signature: this.securityManager.generateSignature(messageId, this.localNode.nodeId, enrichedPayload),
      verificationStatus: 'Pending Verification',
      hopsHistory: [
        {
          hopNumber: 0,
          nodeId: this.localNode.nodeId,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    };

    // Cache locally & Enqueue
    this.messageCache.processAndCache(message);
    this.offlineQueue.enqueue(message);
    this.localNode.pendingQueueSize = this.offlineQueue.getQueueSize();

    meshEventBus.emit('messageCreated', { message });

    // Attempt relay if nearby nodes exist
    this.attemptRelay(message);

    return message;
  }

  /**
   * Verify and Admit a mesh package to central GIS & State
   */
  public verifyAndAdmitMessage(messageId: string, verifierName = 'System Admin'): MeshMessage | undefined {
    const updated = this.offlineQueue.updateVerificationStatus(messageId, 'Verified & Admitted', verifierName);
    if (updated) {
      meshEventBus.emit('messageVerifiedAndAdmitted', { message: updated, verifierName });
    }
    return updated;
  }

  /**
   * Reject a mesh package as invalid / false alarm
   */
  public rejectMessage(messageId: string, reason = 'Flagged as invalid / unverified by operator'): MeshMessage | undefined {
    const updated = this.offlineQueue.updateVerificationStatus(messageId, 'Rejected', 'System Admin', reason);
    if (updated) {
      meshEventBus.emit('messageRejectedByAdmin', { message: updated, reason });
    }
    return updated;
  }

  /**
   * Process incoming mesh message from another device
   */
  public async processIncomingMessage(incomingMsg: MeshMessage): Promise<{ accepted: boolean; reason?: string }> {
    this.stats.messagesReceived++;

    // Security check
    const secResult = this.securityManager.verifyMessage(incomingMsg);
    if (!secResult.isValid) {
      console.warn(`[MeshManager] Message rejected by security manager: ${secResult.reason}`);
      meshEventBus.emit('messageRejected', { messageId: incomingMsg.messageId, reason: secResult.reason });
      return { accepted: false, reason: secResult.reason };
    }

    // Check Duplicate & Cache
    const cacheResult = this.messageCache.processAndCache(incomingMsg);
    if (!cacheResult.isNew) {
      this.stats.duplicateBlocked++;
      console.log(`[MeshManager] Duplicate message ${incomingMsg.messageId} discarded.`);
      meshEventBus.emit('duplicateBlocked', { messageId: incomingMsg.messageId });
      return { accepted: false, reason: 'Duplicate message discarded to prevent loops' };
    }

    // Update message state
    const processedMsg: MeshMessage = {
      ...incomingMsg,
      hopCount: incomingMsg.hopCount + 1,
      ttl: incomingMsg.ttl - 1,
      deliveryState: 'RECEIVED',
      hopsHistory: [
        ...(incomingMsg.hopsHistory || []),
        {
          hopNumber: incomingMsg.hopCount + 1,
          nodeId: this.localNode.nodeId,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    };

    this.offlineQueue.enqueue(processedMsg);
    this.localNode.pendingQueueSize = this.offlineQueue.getQueueSize();

    meshEventBus.emit('messageReceived', { message: processedMsg });

    // Send ACK back to sender if needed
    this.sendAck(incomingMsg.messageId, incomingMsg.senderNodeId || incomingMsg.originNodeId);

    // If local node is a GATEWAY or online, sync immediately
    if (this.localNode.role === 'GATEWAY' || this.syncManager.getOnlineStatus()) {
      await this.syncSingleMessage(processedMsg);
    } else if (cacheResult.shouldRelay && this.powerMode !== 'Mesh Off') {
      // Relay to other nodes if TTL permits
      this.attemptRelay(processedMsg);
    }

    return { accepted: true };
  }

  private async sendAck(messageId: string, targetNodeId: string) {
    console.log(`[MeshManager] Sending ACK for ${messageId} to ${targetNodeId}`);
    meshEventBus.emit('ackSent', { messageId, targetNodeId });
  }

  /**
   * Attempt peer-to-peer relay to nearby nodes
   */
  public async attemptRelay(message: MeshMessage) {
    if (this.powerMode === 'Mesh Off') return;

    const peers = this.peerManager.getConnectedPeers();
    if (peers.length === 0) {
      console.log(`[MeshManager] No nearby peers available for message relay ${message.messageId}`);
      this.offlineQueue.updateDeliveryState(message.messageId, 'QUEUED');
      return;
    }

    this.offlineQueue.updateDeliveryState(message.messageId, 'TRANSFERRED');

    for (const peer of peers) {
      if (peer.nodeId === message.senderNodeId) continue; // Skip sender

      console.log(`[MeshManager] Relaying message ${message.messageId} to peer ${peer.nodeId} (${peer.deviceName})`);
      const success = await this.transportManager.sendPeerMessage(peer.nodeId, message);
      if (success) {
        this.stats.messagesRelayed++;
        this.offlineQueue.updateDeliveryState(message.messageId, 'RELAYED');
        meshEventBus.emit('messageRelayed', { messageId: message.messageId, peerNodeId: peer.nodeId });
      }
    }
  }

  /**
   * Sync all pending queued offline messages to cloud
   */
  public async attemptCloudSync(): Promise<number> {
    if (!this.syncManager.getOnlineStatus()) return 0;

    const pending = this.offlineQueue.getPendingSyncMessages();
    if (pending.length === 0) return 0;

    let syncedCount = 0;
    for (const msg of pending) {
      const res = await this.syncSingleMessage(msg);
      if (res) syncedCount++;
    }

    this.stats.lastSyncTimestamp = new Date().toLocaleTimeString();
    meshEventBus.emit('allQueueSynced', { syncedCount });
    return syncedCount;
  }

  private async syncSingleMessage(message: MeshMessage): Promise<boolean> {
    this.offlineQueue.updateDeliveryState(message.messageId, 'SYNCING');
    const result = await this.syncManager.syncMessageToCloud(message);

    if (result.success) {
      this.stats.messagesSynced++;
      this.offlineQueue.markSynced(message.messageId, this.localNode.nodeId);
      this.localNode.pendingQueueSize = this.offlineQueue.getQueueSize();

      meshEventBus.emit('messageSyncedToCloud', { message, ackMessageId: result.ackMessageId });
      return true;
    } else {
      this.offlineQueue.updateDeliveryState(message.messageId, 'FAILED');
      return false;
    }
  }

  /**
   * Returns current mesh diagnostics snapshot for Observability Dashboard
   */
  public getDiagnostics(): MeshDiagnosticsStats {
    return {
      nodeId: this.localNode.nodeId,
      role: this.localNode.role,
      powerMode: this.powerMode,
      internetConnected: this.syncManager.getOnlineStatus(),
      meshActive: this.powerMode !== 'Mesh Off',
      nearbyNodesCount: this.peerManager.getConnectedPeers().length,
      queueSize: this.offlineQueue.getQueueSize(),
      messagesReceived: this.stats.messagesReceived,
      messagesRelayed: this.stats.messagesRelayed,
      messagesSynced: this.stats.messagesSynced,
      duplicateMessagesBlocked: this.stats.duplicateBlocked,
      lastCloudSync: this.stats.lastSyncTimestamp,
      securityStatus: this.localNode.status,
      batteryLevel: this.localNode.batteryLevel,
    };
  }
}

export const meshManager = MeshManager.getInstance();
