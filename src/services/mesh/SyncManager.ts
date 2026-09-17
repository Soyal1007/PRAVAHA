// Sync Manager for Eventual Cloud Synchronization of Mesh Messages

import { MeshMessage } from './meshTypes';
import { meshEventBus } from './MeshEventBus';

export class SyncManager {
  private isOnline: boolean = navigator ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    meshEventBus.emit('connectivityStatusChanged', { online });
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    meshEventBus.emit('connectivityStatusChanged', { online });
    if (online) {
      meshEventBus.emit('autoSyncTriggered');
    }
  }

  /**
   * Syncs a mesh message to the central backend/app state.
   */
  async syncMessageToCloud(message: MeshMessage): Promise<{ success: boolean; ackMessageId?: string }> {
    console.log(`[SyncManager] Uploading mesh message ${message.messageId} to PRAVAHA Cloud API...`);
    
    meshEventBus.emit('syncStarted', { messageId: message.messageId });
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API network latency

    meshEventBus.emit('syncCompleted', { messageId: message.messageId, message });
    
    // Generate ACK message
    const ackMessageId = `ACK-${message.messageId}`;
    return {
      success: true,
      ackMessageId,
    };
  }
}
