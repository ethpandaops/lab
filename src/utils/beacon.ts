/**
 * Beacon chain timing constants
 */
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

/**
 * Represents a phase within a beacon chain slot
 */
export interface SlotPhase {
  /** Label for this phase (e.g., "Block Proposal", "Attestation") */
  label: string;
  /** Duration of this phase in milliseconds */
  duration: number;
  /** Tailwind classes to apply to this phase background (e.g., 'bg-primary', 'bg-success border-2') */
  className: string;
  /** Tailwind classes to apply to the phase text (e.g., 'text-white', 'text-foreground') */
  textClassName?: string;
  /** Optional description for accessibility */
  description?: string;
}

/**
 * Default Ethereum beacon chain slot phases (12000 milliseconds total).
 *
 * Based on standard beacon chain slot timing:
 * - 0-4000ms: Block - Proposer broadcasts the block
 * - 4000-8000ms: Attestations - Validators attest to the block
 * - 8000-12000ms: Aggregations - Attestations are aggregated
 */
export const DEFAULT_BEACON_SLOT_PHASES: SlotPhase[] = [
  {
    label: 'Block',
    duration: 4000,
    className: 'bg-cyan-500',
    textClassName: 'text-cyan-200 font-bold',
    description: 'Proposer broadcasts block',
  },
  {
    label: 'Attestations',
    duration: 4000,
    className: 'bg-green-500',
    textClassName: 'text-green-200 font-bold',
    description: 'Validators attest to block',
  },
  {
    label: 'Aggregations',
    duration: 4000,
    className: 'bg-amber-500',
    textClassName: 'text-amber-200 font-bold',
    description: 'Attestations aggregated',
  },
];

/**
 * Convert slot number to Unix timestamp
 *
 * @param slot - Slot number
 * @param genesisTime - Genesis time in Unix seconds
 * @returns Unix timestamp in seconds
 *
 * @example
 * ```tsx
 * slotToTimestamp(100, 1606824023) // Returns 1606825223
 * ```
 */
export function slotToTimestamp(slot: number, genesisTime: number): number {
  return genesisTime + slot * SECONDS_PER_SLOT;
}

/**
 * Convert epoch number to Unix timestamp (start of first slot in epoch)
 *
 * @param epoch - Epoch number
 * @param genesisTime - Genesis time in Unix seconds
 * @returns Unix timestamp in seconds
 *
 * @example
 * ```tsx
 * epochToTimestamp(10, 1606824023) // Returns 1606827863 (10 * 32 * 12 seconds after genesis)
 * ```
 */
export function epochToTimestamp(epoch: number, genesisTime: number): number {
  return genesisTime + epoch * SLOTS_PER_EPOCH * SECONDS_PER_SLOT;
}

/**
 * Convert timestamp to epoch number
 *
 * @param timestamp - Unix timestamp in seconds
 * @param genesisTime - Genesis time in Unix seconds
 * @returns Epoch number
 *
 * @example
 * ```tsx
 * timestampToEpoch(1606827863, 1606824023) // Returns 10
 * ```
 */
export function timestampToEpoch(timestamp: number, genesisTime: number): number {
  return Math.floor((timestamp - genesisTime) / (SLOTS_PER_EPOCH * SECONDS_PER_SLOT));
}

/**
 * Get the slot range for a given epoch
 *
 * @param epoch - Epoch number
 * @returns Object with firstSlot and lastSlot of the epoch
 *
 * @example
 * ```tsx
 * getEpochSlotRange(10) // Returns { firstSlot: 320, lastSlot: 351 }
 * ```
 */
export function getEpochSlotRange(epoch: number): { firstSlot: number; lastSlot: number } {
  const firstSlot = epoch * SLOTS_PER_EPOCH;
  const lastSlot = firstSlot + SLOTS_PER_EPOCH - 1;
  return { firstSlot, lastSlot };
}
