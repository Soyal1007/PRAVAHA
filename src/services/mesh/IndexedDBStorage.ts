// Real IndexedDB persistent storage for PRAVAHA Mesh store-and-forward queue & cache

import { MeshMessage } from './meshTypes';

const DB_NAME = 'PRAVAHA_MESH_DB';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_queue';
const CACHE_STORE = 'message_cache';

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<boolean> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('[IndexedDB] IndexedDB not available, using localStorage fallback.');
      return false;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (evt) => {
        console.error('[IndexedDB] Error opening database:', evt);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] PRAVAHA Mesh Database initialized successfully.');
        resolve(true);
      };

      request.onupgradeneeded = (evt: IDBVersionChangeEvent) => {
        const db = (evt.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'messageId' });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'messageId' });
        }
      };
    });
  }

  async saveQueueMessage(message: MeshMessage): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.put(message);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async removeQueueMessage(messageId: string): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(messageId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAllQueueMessages(): Promise<MeshMessage[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async clearQueue(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
    });
  }
}

export const indexedDBStorage = new IndexedDBStorage();
