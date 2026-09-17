// Message Cache & Duplicate Prevention Engine for PRAVAHA Mesh

import { MeshMessage } from './meshTypes';

export class MessageCache {
  private processedMessageIds: Set<string> = new Set();
  private cachedMessages: Map<string, MeshMessage> = new Map();
  private maxCacheSize: number = 500;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('pravaha_mesh_cache');
      if (stored) {
        const parsed: MeshMessage[] = JSON.parse(stored);
        parsed.forEach(msg => {
          this.processedMessageIds.add(msg.messageId);
          this.cachedMessages.set(msg.messageId, msg);
        });
      }
    } catch (e) {
      console.warn('Failed to load mesh message cache from storage', e);
    }
  }

  private persist() {
    try {
      const list = Array.from(this.cachedMessages.values()).slice(-100);
      localStorage.setItem('pravaha_mesh_cache', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save mesh message cache', e);
    }
  }

  /**
   * Checks if message has already been processed by this node.
   * If yes, returns true (duplicate).
   */
  isDuplicate(messageId: string): boolean {
    return this.processedMessageIds.has(messageId);
  }

  /**
   * Store and mark message as processed. Returns false if message shouldn't be processed (expired TTL or duplicate).
   */
  processAndCache(message: MeshMessage): { shouldRelay: boolean; isNew: boolean } {
    if (this.isDuplicate(message.messageId)) {
      return { shouldRelay: false, isNew: false };
    }

    // Check TTL
    if (message.ttl <= 0) {
      console.log(`[MessageCache] Message ${message.messageId} TTL exhausted (${message.ttl}). Dropping relay.`);
      return { shouldRelay: false, isNew: true };
    }

    // Mark processed
    this.processedMessageIds.add(message.messageId);
    this.cachedMessages.set(message.messageId, message);

    // Evict oldest if exceeding capacity
    if (this.processedMessageIds.size > this.maxCacheSize) {
      const oldestKey = this.processedMessageIds.values().next().value;
      if (oldestKey) {
        this.processedMessageIds.delete(oldestKey);
        this.cachedMessages.delete(oldestKey);
      }
    }

    this.persist();

    return {
      shouldRelay: message.ttl > 1,
      isNew: true,
    };
  }

  getMessage(messageId: string): MeshMessage | undefined {
    return this.cachedMessages.get(messageId);
  }

  getAllCachedMessages(): MeshMessage[] {
    return Array.from(this.cachedMessages.values());
  }

  clear() {
    this.processedMessageIds.clear();
    this.cachedMessages.clear();
    localStorage.removeItem('pravaha_mesh_cache');
  }
}
