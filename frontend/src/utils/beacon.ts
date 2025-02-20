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
 * BeaconClockManager provides singleton access to network-specific BeaconClocks
 */
export class BeaconClockManager {
  private static instance: BeaconClockManager
  private clocks: Map<string, BeaconClock> = new Map()
  private config: any

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
        }
      })
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