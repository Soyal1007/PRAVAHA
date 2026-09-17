// Event Bus for Mesh System Updates

type MeshEventListener = (data?: any) => void;

class MeshEventBus {
  private listeners: Map<string, Set<MeshEventListener>> = new Map();

  on(event: string, listener: MeshEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in MeshEventBus listener for ${event}:`, err);
        }
      });
    }
  }

  off(event: string, listener: MeshEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const meshEventBus = new MeshEventBus();
