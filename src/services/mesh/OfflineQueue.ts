// Offline Store-and-Forward Queue for PRAVAHA Mesh

import { MeshMessage, MeshDeliveryState } from './meshTypes';

const QUEUE_STORAGE_KEY = 'pravaha_mesh_offline_queue';

export class OfflineQueue {
  private queue: Map<string, MeshMessage> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        const parsed: MeshMessage[] = JSON.parse(data);
        parsed.forEach(msg => this.queue.set(msg.messageId, msg));
      }
    } catch (e) {
      console.warn('Failed to load offline mesh queue', e);
    }
  }

  private persist() {
    try {
      const list = Array.from(this.queue.values());
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to persist offline mesh queue', e);
    }
  }

  enqueue(message: MeshMessage): void {
    const updated: MeshMessage = {
      ...message,
      deliveryState: message.deliveryState || 'QUEUED',
    };
    this.queue.set(message.messageId, updated);
    this.persist();
  }

  updateDeliveryState(messageId: string, state: MeshDeliveryState, extra?: Partial<MeshMessage>): void {
    const existing = this.queue.get(messageId);
    if (existing) {
      const updated: MeshMessage = {
        ...existing,
        ...extra,
        deliveryState: state,
      };
      this.queue.set(messageId, updated);
      this.persist();
    }
  }

  updateVerificationStatus(
    messageId: string,
    status: 'Pending Verification' | 'Verified & Admitted' | 'Rejected',
    verifiedBy?: string,
    reason?: string
  ): MeshMessage | undefined {
    const existing = this.queue.get(messageId);
    if (existing) {
      const payload = {
        ...(existing.payload as any),
        verificationStatus: status,
        verifiedBy: verifiedBy || 'System Admin',
        verifiedAt: new Date().toISOString(),
        rejectionReason: reason,
      };
      const updated: MeshMessage = {
        ...existing,
        verificationStatus: status,
        verifiedBy: verifiedBy || 'System Admin',
        verifiedAt: new Date().toISOString(),
        rejectionReason: reason,
        payload,
      };
      this.queue.set(messageId, updated);
      this.persist();
      return updated;
    }
    return undefined;
  }

  getPendingSyncMessages(): MeshMessage[] {
    const list = Array.from(this.queue.values()).filter(
      m => m.deliveryState !== 'SYNCED' && m.deliveryState !== 'EXPIRED' && m.deliveryState !== 'FAILED'
    );

    // Prioritize CRITICAL > HIGH > NORMAL > LOW
    const priorityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1,
    };

    return list.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
  }

  getAllMessages(): MeshMessage[] {
    return Array.from(this.queue.values());
  }

  getMessage(messageId: string): MeshMessage | undefined {
    return this.queue.get(messageId);
  }

  getQueueSize(): number {
    return this.getPendingSyncMessages().length;
  }

  markSynced(messageId: string, gatewayNodeId?: string): void {
    this.updateDeliveryState(messageId, 'SYNCED', {
      syncedTimestamp: new Date().toISOString(),
      syncedGatewayNodeId: gatewayNodeId || 'DIRECT_CLOUD',
    });
  }

  clearQueue(): void {
    this.queue.clear();
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  }
}
