import type { Network } from '@/hooks/useConfig';

/**
 * Beacon chain timing constants
 */
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

/**
 * Attestation deadline in milliseconds (duration of block propagation phase).
 * Blocks should be propagated within this time for validators to attest.
 */
export const ATTESTATION_DEADLINE_MS = 4000;

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
    duration: ATTESTATION_DEADLINE_MS,
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
 * Convert slot number to epoch number
 *
 * @param slot - Slot number
 * @returns Epoch number
 *
 * @example
 * ```tsx
 * slotToEpoch(100) // Returns 3 (100 / 32 = 3.125, floored to 3)
 * ```
 */
export function slotToEpoch(slot: number): number {
  return Math.floor(slot / SLOTS_PER_EPOCH);
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

/**
 * Check if the current epoch is at or after a target fork epoch
 *
 * @param currentEpoch - Current epoch number
 * @param forkEpoch - Target fork epoch (undefined if not configured for network)
 * @returns true if current epoch >= fork epoch, false otherwise
 *
 * @example
 * ```tsx
 * isEpochAtOrAfter(1000, 500) // Returns true (1000 >= 500)
 * isEpochAtOrAfter(100, 500) // Returns false (100 < 500)
 * isEpochAtOrAfter(1000, undefined) // Returns false (fork not configured)
 * ```
 */
export function isEpochAtOrAfter(currentEpoch: number, forkEpoch?: number): boolean {
  if (forkEpoch === undefined) {
    return false;
  }
  return currentEpoch >= forkEpoch;
}

/**
 * Beacon chain fork version identifiers
 */
export type ForkVersion = 'phase0' | 'altair' | 'bellatrix' | 'capella' | 'deneb' | 'electra' | 'fulu';

/**
 * Metadata for a beacon chain fork
 */
export interface ForkMetadata {
  /** Fork version identifier */
  version: ForkVersion;
  /** Display name */
  name: string;
  /** Emoji icon representing the fork */
  emoji: string;
  /** Tailwind color classes for the fork label */
  color: string;
  /** Description of what the fork represents */
  description: string;
}

/**
 * Fork metadata constants for all beacon chain forks
 */
export const FORK_METADATA: Record<ForkVersion, ForkMetadata> = {
  phase0: {
    version: 'phase0',
    name: 'Phase 0',
    emoji: '🚀',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-400/10 dark:text-gray-400',
    description: 'Genesis - Beacon chain launch',
  },
  altair: {
    version: 'altair',
    name: 'Altair',
    emoji: '🦅',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400',
    description: 'First beacon chain upgrade - Light client support',
  },
  bellatrix: {
    version: 'bellatrix',
    name: 'Bellatrix',
    emoji: '🐼',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-400',
    description: 'The Merge - Transition to proof-of-stake',
  },
  capella: {
    version: 'capella',
    name: 'Capella',
    emoji: '🐋',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
    description: 'Shanghai/Capella - Validator withdrawals enabled',
  },
  deneb: {
    version: 'deneb',
    name: 'Deneb',
    emoji: '🐡',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400',
    description: 'Cancun/Deneb - Proto-danksharding (EIP-4844)',
  },
  electra: {
    version: 'electra',
    name: 'Electra',
    emoji: '🦒',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400',
    description: 'Electra upgrade - MaxEB and other improvements',
  },
  fulu: {
    version: 'fulu',
    name: 'Fulu',
    emoji: '🦓',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-400/10 dark:text-pink-400',
    description: 'Fulu - PeerDAS and more',
  },
} as const;

/**
 * Determine the active fork for a given slot based on network fork schedule
 *
 * @param slot - Slot number
 * @param network - Network configuration containing fork schedule
 * @returns The active fork version for the slot
 *
 * @example
 * ```tsx
 * const fork = getForkForSlot(10000000, network);
 * // Returns 'deneb' if slot falls within Deneb fork range
 * ```
 */
export function getForkForSlot(slot: number, network: Network | null): ForkVersion {
  if (!network) {
    return 'electra';
  }

  const epoch = slotToEpoch(slot);
  const { forks } = network;

  // Check forks in reverse chronological order (newest to oldest)
  // Note: The config only has 'electra' and 'fusaka' in consensus forks currently
  // We map 'fusaka' to 'fulu' for consistency with our ForkVersion type
  if (forks.consensus.fusaka && epoch >= forks.consensus.fusaka.epoch) {
    return 'fulu';
  }

  if (forks.consensus.electra && epoch >= forks.consensus.electra.epoch) {
    return 'electra';
  }

  // If no specific fork found, return 'deneb' as it's the current mainnet fork
  // In a full implementation, this should check all historical forks
  return 'deneb';
}
