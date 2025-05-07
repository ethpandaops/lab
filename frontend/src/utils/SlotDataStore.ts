/**
 * A global store for slot data that persists outside of component lifecycle
 * This ensures data preservation across component unmounts/remounts
 */

// Type for slot data
export interface SlotData {
  network: string;
  slot: number;
  data: any;
  timestamp: number; // When this data was fetched
}

class SlotDataStore {
  private static instance: SlotDataStore;
  private slotDataCache: Map<string, SlotData> = new Map();
  private maxCacheSize: number = 5; // Store data for up to 5 slots
  private maxAgeMs: number = 5 * 60 * 1000; // 5 minutes

  // Private constructor for singleton
  private constructor() {}

  // Get the singleton instance
  public static getInstance(): SlotDataStore {
    if (!SlotDataStore.instance) {
      SlotDataStore.instance = new SlotDataStore();
    }
    return SlotDataStore.instance;
  }

  // Generate a cache key from network and slot
  private getCacheKey(network: string, slot: number): string {
    return `${network}:${slot}`;
  }

  // Store slot data
  public storeSlotData(network: string, slot: number, data: any): void {
    const key = this.getCacheKey(network, slot);

    // Store the data with a timestamp
    this.slotDataCache.set(key, {
      network,
      slot,
      data,
      timestamp: Date.now(),
    });

    // Clean up old entries if we exceed the cache size
    if (this.slotDataCache.size > this.maxCacheSize) {
      this.cleanupOldEntries();
    }
  }

  // Get slot data if it exists and is not too old
  public getSlotData(network: string, slot: number): any | null {
    const key = this.getCacheKey(network, slot);
    const entry = this.slotDataCache.get(key);

    // If entry doesn't exist, return null
    if (!entry) {
      return null;
    }

    // Check if the data is too old
    const now = Date.now();
    if (now - entry.timestamp > this.maxAgeMs) {
      this.slotDataCache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Check if we have data for a slot
  public hasSlotData(network: string, slot: number): boolean {
    const key = this.getCacheKey(network, slot);
    const entry = this.slotDataCache.get(key);

    // If entry doesn't exist, return false
    if (!entry) {
      return false;
    }

    // Check if the data is too old
    const now = Date.now();
    if (now - entry.timestamp > this.maxAgeMs) {
      return false;
    }

    return true;
  }

  // Remove old entries from the cache
  private cleanupOldEntries(): void {
    // Convert to array for sorting
    const entries = Array.from(this.slotDataCache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize);

    for (const [key] of entriesToRemove) {
      this.slotDataCache.delete(key);
    }
  }

  // Debug method to get cache stats
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.slotDataCache.size,
      keys: Array.from(this.slotDataCache.keys()),
    };
  }
}

export default SlotDataStore;
