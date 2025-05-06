/**
 * Constants for beacon chain timing calculations
 */
export const SECONDS_PER_SLOT = 12
export const SLOTS_PER_EPOCH = 32

/**
 * BeaconClock provides utilities for beacon chain time calculations
 */
export class BeaconClock {
  private genesisTime: number
  
  constructor(genesisTime: number) {
    this.genesisTime = genesisTime
  }

  /**
   * Get the current slot number
   */
  getCurrentSlot(): number {
    const now = Math.floor(Date.now() / 1000)
    return Math.floor((now - this.genesisTime) / SECONDS_PER_SLOT)
  }

  /**
   * Get the current epoch number
   */
  getCurrentEpoch(): number {
    return Math.floor(this.getCurrentSlot() / SLOTS_PER_EPOCH)
  }

  /**
   * Get the start time of a slot (in seconds since Unix epoch)
   */
  getSlotStartTime(slot: number): number {
    return this.genesisTime + (slot * SECONDS_PER_SLOT)
  }

  /**
   * Get the end time of a slot (in seconds since Unix epoch)
   */
  getSlotEndTime(slot: number): number {
    return this.getSlotStartTime(slot) + SECONDS_PER_SLOT
  }

  /**
   * Get the slot number at a specific timestamp
   */
  getSlotAtTime(timestamp: number): number {
    return Math.floor((timestamp - this.genesisTime) / SECONDS_PER_SLOT)
  }

  /**
   * Get the epoch number at a specific timestamp
   */
  getEpochAtTime(timestamp: number): number {
    return Math.floor(this.getSlotAtTime(timestamp) / SLOTS_PER_EPOCH)
  }

  /**
   * Get the first slot of an epoch
   */
  getFirstSlotOfEpoch(epoch: number): number {
    return epoch * SLOTS_PER_EPOCH
  }

  /**
   * Get the last slot of an epoch
   */
  getLastSlotOfEpoch(epoch: number): number {
    return this.getFirstSlotOfEpoch(epoch + 1) - 1
  }

  /**
   * Get the epoch of a slot
   */
  getEpochOfSlot(slot: number): number {
    return Math.floor(slot / SLOTS_PER_EPOCH)
  }

  /**
   * Get the progress through the current slot (0-1)
   */
  getCurrentSlotProgress(): number {
    const now = Math.floor(Date.now() / 1000)
    const currentSlot = this.getCurrentSlot()
    const slotStart = this.getSlotStartTime(currentSlot)
    return Math.min(1, Math.max(0, (now - slotStart) / SECONDS_PER_SLOT))
  }

  /**
   * Get the time until the next slot (in seconds)
   */
  getTimeUntilNextSlot(): number {
    const now = Math.floor(Date.now() / 1000)
    const currentSlot = this.getCurrentSlot()
    const nextSlotStart = this.getSlotStartTime(currentSlot + 1)
    return Math.max(0, nextSlotStart - now)
  }

  /**
   * Check if a slot is in the future
   */
  isFutureSlot(slot: number): boolean {
    return slot > this.getCurrentSlot()
  }

  /**
   * Format a slot timestamp as a human-readable string
   */
  formatSlotTime(slot: number): string {
    return new Date(this.getSlotStartTime(slot) * 1000).toLocaleString()
  }
}

/**
 * Type definition for slot change callback function
 */
export type SlotChangeCallback = (network: string, newSlot: number, previousSlot: number) => void;

/**
 * BeaconClockManager provides singleton access to network-specific BeaconClocks
 */
export class BeaconClockManager {
  private static instance: BeaconClockManager
  private clocks: Map<string, BeaconClock> = new Map()
  private config: any
  private slotChangeCallbacks: Map<string, SlotChangeCallback[]> = new Map()
  private currentSlots: Map<string, number> = new Map()
  private slotCheckInterval: NodeJS.Timeout | null = null

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): BeaconClockManager {
    if (!BeaconClockManager.instance) {
      BeaconClockManager.instance = new BeaconClockManager()
    }
    return BeaconClockManager.instance
  }

  /**
   * Initialize the manager with config
   */
  initialize(config: any): void {
    this.config = config
    
    // Create clocks for all networks in the config
    if (config?.ethereum?.networks) {
      Object.entries(config.ethereum.networks).forEach(([network, networkConfig]: [string, any]) => {
        const genesisTime = networkConfig.genesis_time
        if (genesisTime) {
          this.clocks.set(network, new BeaconClock(genesisTime))
          // Initialize the current slot for each network
          const clock = new BeaconClock(genesisTime)
          this.currentSlots.set(network, clock.getCurrentSlot())
        }
      })
    }

    // Start slot monitoring if not already running
    this.startSlotMonitoring()
  }

  /**
   * Start monitoring for slot changes across all networks
   */
  private startSlotMonitoring(): void {
    // Clear any existing interval
    if (this.slotCheckInterval) {
      clearInterval(this.slotCheckInterval)
    }

    // Check for slot changes every second
    this.slotCheckInterval = setInterval(() => {
      this.clocks.forEach((clock, network) => {
        const currentSlot = clock.getCurrentSlot()
        const previousSlot = this.currentSlots.get(network) || currentSlot
        
        // If the slot has changed
        if (currentSlot !== previousSlot) {
          // Update stored slot
          this.currentSlots.set(network, currentSlot)
          
          // Notify listeners
          this.notifySlotChange(network, currentSlot, previousSlot)
        }
      })
    }, 1000)
  }

  /**
   * Notify all registered callbacks about a slot change
   */
  private notifySlotChange(network: string, newSlot: number, previousSlot: number): void {
    const callbacks = this.slotChangeCallbacks.get(network) || []
    callbacks.forEach(callback => {
      try {
        callback(network, newSlot, previousSlot)
      } catch (error) {
        console.error(`Error in slot change callback for network ${network}:`, error)
      }
    })
  }

  /**
   * Register a callback for slot changes on a specific network
   * Returns a function that can be called to unregister the callback
   */
  subscribeToSlotChanges(network: string, callback: SlotChangeCallback): () => void {
    // Initialize the callbacks array for this network if it doesn't exist
    if (!this.slotChangeCallbacks.has(network)) {
      this.slotChangeCallbacks.set(network, [])
    }
    
    // Add the callback to the list
    const callbacks = this.slotChangeCallbacks.get(network)!
    callbacks.push(callback)
    
    // Return a function to unsubscribe
    return () => {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get a BeaconClock for a specific network
   */
  getBeaconClock(network: string): BeaconClock | null {
    return this.clocks.get(network) || null
  }

  /**
   * Get all available networks
   */
  getAvailableNetworks(): string[] {
    return Array.from(this.clocks.keys())
  }

  /**
   * Get head lag slots for a network
   */
  getHeadLagSlots(network: string): number {
    return this.config?.modules?.beacon?.networks?.[network]?.head_lag_slots ?? 4
  }

  /**
   * Get backlog days for a network
   */
  getBacklogDays(network: string): number {
    return this.config?.modules?.beacon?.networks?.[network]?.backlog_days ?? 3
  }
} 