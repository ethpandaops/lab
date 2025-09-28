import { useContext as reactUseContext, createContext, useState, useEffect, ReactNode } from 'react';
import { Config } from '@/api/client.ts';

// Constants for beacon chain timing calculations
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

/**
 * BeaconClock provides utilities for beacon chain time calculations
 */
export class BeaconClock {
  private genesisTime: number;

  constructor(genesisTime: number) {
    this.genesisTime = genesisTime;
  }

  // For slot numbers, we still use seconds precision since slots are whole numbers
  getCurrentSlot(): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.floor((now - this.genesisTime) / SECONDS_PER_SLOT);
  }

  getCurrentEpoch(): number {
    return Math.floor(this.getCurrentSlot() / SLOTS_PER_EPOCH);
  }

  getSlotStartTime(slot: number): number {
    return this.genesisTime + slot * SECONDS_PER_SLOT;
  }

  getSlotEndTime(slot: number): number {
    return this.getSlotStartTime(slot) + SECONDS_PER_SLOT;
  }

  getSlotAtTime(timestamp: number): number {
    return Math.floor((timestamp - this.genesisTime) / SECONDS_PER_SLOT);
  }

  getEpochAtTime(timestamp: number): number {
    return Math.floor(this.getSlotAtTime(timestamp) / SLOTS_PER_EPOCH);
  }

  getFirstSlotOfEpoch(epoch: number): number {
    return epoch * SLOTS_PER_EPOCH;
  }

  getLastSlotOfEpoch(epoch: number): number {
    return this.getFirstSlotOfEpoch(epoch + 1) - 1;
  }

  getEpochOfSlot(slot: number): number {
    return Math.floor(slot / SLOTS_PER_EPOCH);
  }

  getCurrentSlotProgress(): number {
    const now = Date.now() / 1000; // Remove Math.floor to keep millisecond precision
    const currentSlot = this.getCurrentSlot();
    const slotStart = this.getSlotStartTime(currentSlot);
    return Math.min(1, Math.max(0, (now - slotStart) / SECONDS_PER_SLOT));
  }

  getTimeUntilNextSlot(): number {
    const now = Date.now() / 1000; // Remove Math.floor to keep millisecond precision
    const currentSlot = this.getCurrentSlot();
    const nextSlotStart = this.getSlotStartTime(currentSlot + 1);
    return Math.max(0, nextSlotStart - now);
  }

  isFutureSlot(slot: number): boolean {
    return slot > this.getCurrentSlot();
  }

  formatSlotTime(slot: number): string {
    return new Date(this.getSlotStartTime(slot) * 1000).toLocaleString();
  }
}

// Type definition for slot change callback function
export type SlotChangeCallback = (network: string, newSlot: number, previousSlot: number) => void;

// State interface for the context
export interface State {
  config: Config;
  setConfig: (config: Config) => void;
  clocks: Map<string, BeaconClock>;
  currentSlots: Map<string, number>;
  subscribeToSlotChanges: (network: string, callback: SlotChangeCallback) => () => void;
  getBeaconClock: (network: string) => BeaconClock | null;
  getHeadLagSlots: (network: string) => number;
  getBacklogDays: (network: string) => number;
}

// Props for useValue hook
export interface ValueProps {
  config: Config;
}

// Create the context
export const Context = createContext<State | undefined>(undefined);

// Custom hook to use the beacon context
export default function useContext() {
  const context = reactUseContext(Context);
  if (context === undefined) {
    throw new Error('Beacon context must be used within a Beacon provider');
  }
  return context;
}

// Implementation of the useValue hook similar to network.ts
export function useValue(props: ValueProps): State {
  const [config, setConfig] = useState<Config>(props.config);
  const [clocks, setClocks] = useState<Map<string, BeaconClock>>(new Map());
  const [currentSlots, setCurrentSlots] = useState<Map<string, number>>(new Map());
  const [slotChangeCallbacks] = useState<Map<string, SlotChangeCallback[]>>(new Map());

  // Initialize clocks when config changes
  useEffect(() => {
    const newClocks = new Map<string, BeaconClock>();
    const newCurrentSlots = new Map<string, number>();

    if (config?.ethereum?.networks) {
      Object.entries(config.ethereum.networks).forEach(([network, networkConfig]) => {
        if (networkConfig && typeof networkConfig === 'object') {
          const genesisTime = Number(networkConfig.genesis_time);
          if (genesisTime) {
            const clock = new BeaconClock(genesisTime);
            newClocks.set(network, clock);
            newCurrentSlots.set(network, clock.getCurrentSlot());
          }
        }
      });
    }

    setClocks(newClocks);
    setCurrentSlots(newCurrentSlots);
  }, [config]);

  // Set up slot monitoring
  useEffect(() => {
    if (clocks.size === 0) return;

    const intervalId = setInterval(() => {
      const newCurrentSlots = new Map(currentSlots);
      let hasChanges = false;

      clocks.forEach((clock, network) => {
        const newSlot = clock.getCurrentSlot();
        const prevSlot = currentSlots.get(network) || newSlot;

        if (newSlot !== prevSlot) {
          newCurrentSlots.set(network, newSlot);
          hasChanges = true;

          // Notify listeners
          const callbacks = slotChangeCallbacks.get(network) || [];
          callbacks.forEach(callback => {
            try {
              callback(network, newSlot, prevSlot);
            } catch (error) {
              console.error(`Error in slot change callback for network ${network}:`, error);
            }
          });
        }
      });

      if (hasChanges) {
        setCurrentSlots(newCurrentSlots);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [clocks, currentSlots, slotChangeCallbacks]);

  // Function to subscribe to slot changes
  const subscribeToSlotChanges = (network: string, callback: SlotChangeCallback): (() => void) => {
    if (!slotChangeCallbacks.has(network)) {
      slotChangeCallbacks.set(network, []);
    }

    const callbacks = slotChangeCallbacks.get(network)!;
    callbacks.push(callback);

    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  };

  // Function to get a beacon clock for a network
  const getBeaconClock = (network: string): BeaconClock | null => {
    return clocks.get(network) || null;
  };

  // Function to get head lag slots for a network
  const getHeadLagSlots = (network: string): number => {
    // Get from live-slots experiment config
    if (config?.experiments) {
      const liveSlots = config.experiments.find(exp => exp.id === 'live-slots');
      if (liveSlots?.config?.fields?.head_delay_slots) {
        const value = liveSlots.config.fields.head_delay_slots;
        // Handle different protobuf struct value types
        if (typeof value === 'object' && 'numberValue' in value) {
          return value.numberValue;
        }
      }
    }
    // Default value
    return 2;
  };

  // Function to get backlog days for a network
  const getBacklogDays = (network: string): number => {
    // Get from historical-slots experiment config
    if (config?.experiments) {
      const historicalSlots = config.experiments.find(exp => exp.id === 'historical-slots');
      if (historicalSlots?.config?.fields?.backfill_slots) {
        const value = historicalSlots.config.fields.backfill_slots;
        // Handle different protobuf struct value types
        if (typeof value === 'object' && 'numberValue' in value) {
          return value.numberValue;
        }
      }
    }
    // Default value
    return 1000;
  };

  return {
    config,
    setConfig,
    clocks,
    currentSlots,
    subscribeToSlotChanges,
    getBeaconClock,
    getHeadLagSlots,
    getBacklogDays,
  };
}
