import type { Network } from '@/hooks/useConfig';
import { getActiveFork } from './forks';
import { isForkAtOrAfter } from './forkOrder';

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
 * A slot phase boundary expressed in basis points of the slot duration,
 * mirroring how the consensus config specifies deadlines (ATTESTATION_DUE_BPS
 * etc). Each phase runs from the previous phase's end to endBps.
 */
interface SlotPhaseSpec {
  label: string;
  /** Phase end as basis points (1/10000) of the slot duration */
  endBps: number;
  className: string;
  textClassName: string;
  description: string;
}

/**
 * Pre-gloas slot structure: attestations due at 1/3 of the slot, aggregates
 * at 2/3 (ATTESTATION_DUE_BPS 3333, AGGREGATE_DUE_BPS 6667).
 */
const PRE_GLOAS_PHASE_SPECS: SlotPhaseSpec[] = [
  {
    label: 'Block',
    endBps: 3333,
    className: 'bg-surface border-b-4 border-b-cyan-500/50',
    textClassName: 'text-cyan-600 dark:text-cyan-400 font-bold',
    description: 'Proposer broadcasts block',
  },
  {
    label: 'Attestations',
    endBps: 6667,
    className: 'bg-surface border-b-4 border-b-green-500/50',
    textClassName: 'text-green-600 dark:text-green-400 font-bold',
    description: 'Validators attest to block',
  },
  {
    label: 'Aggregations',
    endBps: 10000,
    className: 'bg-surface border-b-4 border-b-amber-500/50',
    textClassName: 'text-amber-600 dark:text-amber-400 font-bold',
    description: 'Attestations aggregated',
  },
];

/**
 * Gloas (ePBS, EIP-7732) slot structure. The block only commits to a builder
 * bid; the execution payload is revealed separately and judged by the Payload
 * Timeliness Committee. Deadlines from the consensus config:
 * ATTESTATION_DUE_BPS_GLOAS 2500, AGGREGATE_DUE_BPS_GLOAS 5000,
 * INCLUSION_LIST_DUE_BPS 6667, PAYLOAD_DUE_BPS / PAYLOAD_ATTESTATION_DUE_BPS 7500.
 */
const GLOAS_PHASE_SPECS: SlotPhaseSpec[] = [
  {
    label: 'Block',
    endBps: 2500,
    className: 'bg-surface border-b-4 border-b-cyan-500/50',
    textClassName: 'text-cyan-600 dark:text-cyan-400 font-bold',
    description: 'Proposer broadcasts block committing to a builder bid',
  },
  {
    label: 'Attestations',
    endBps: 5000,
    className: 'bg-surface border-b-4 border-b-green-500/50',
    textClassName: 'text-green-600 dark:text-green-400 font-bold',
    description: 'Validators attest to block',
  },
  {
    label: 'Payload',
    endBps: 7500,
    className: 'bg-surface border-b-4 border-b-purple-500/50',
    textClassName: 'text-purple-600 dark:text-purple-400 font-bold',
    description: 'Builder reveals the execution payload, inclusion lists due',
  },
  {
    label: 'PTC',
    endBps: 10000,
    className: 'bg-surface border-b-4 border-b-amber-500/50',
    textClassName: 'text-amber-600 dark:text-amber-400 font-bold',
    description: 'Payload Timeliness Committee attests whether the payload arrived',
  },
];

function phasesFromSpec(specs: SlotPhaseSpec[], slotDurationMs: number): SlotPhase[] {
  let previousEndMs = 0;

  return specs.map(spec => {
    const endMs = Math.round((spec.endBps / 10000) * slotDurationMs);
    const phase: SlotPhase = {
      label: spec.label,
      duration: endMs - previousEndMs,
      className: spec.className,
      textClassName: spec.textClassName,
      description: spec.description,
    };
    previousEndMs = endMs;

    return phase;
  });
}

/**
 * Default Ethereum beacon chain slot phases (12000 milliseconds total).
 *
 * Based on standard beacon chain slot timing:
 * - 0-4000ms: Block - Proposer broadcasts the block
 * - 4000-8000ms: Attestations - Validators attest to the block
 * - 8000-12000ms: Aggregations - Attestations are aggregated
 */
export const DEFAULT_BEACON_SLOT_PHASES: SlotPhase[] = phasesFromSpec(PRE_GLOAS_PHASE_SPECS, SECONDS_PER_SLOT * 1000);

/**
 * Gloas (ePBS) slot phases (12000 milliseconds total): block, attestations,
 * payload reveal, PTC vote.
 */
export const GLOAS_BEACON_SLOT_PHASES: SlotPhase[] = phasesFromSpec(GLOAS_PHASE_SPECS, SECONDS_PER_SLOT * 1000);

/**
 * Get the slot phases for a fork. Gloas and later forks use the ePBS slot
 * structure; everything earlier keeps the classic three-phase layout.
 */
export function getSlotPhases(fork?: ForkVersion | null, slotDurationMs = SECONDS_PER_SLOT * 1000): SlotPhase[] {
  const specs = fork && isForkAtOrAfter(fork, 'gloas') ? GLOAS_PHASE_SPECS : PRE_GLOAS_PHASE_SPECS;

  return phasesFromSpec(specs, slotDurationMs);
}

export { CANONICAL_FORK_ORDER, isForkAtOrAfter } from './forkOrder';

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
 * Convert Unix timestamp to slot number
 *
 * @param timestamp - Unix timestamp in seconds
 * @param genesisTime - Genesis time in Unix seconds
 * @returns Beacon chain slot number
 *
 * @example
 * ```tsx
 * timestampToSlot(1606825223, 1606824023) // Returns 100
 * ```
 */
export function timestampToSlot(timestamp: number, genesisTime: number): number {
  return Math.floor((timestamp - genesisTime) / SECONDS_PER_SLOT);
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
export type ForkVersion = 'phase0' | 'altair' | 'bellatrix' | 'capella' | 'deneb' | 'electra' | 'fulu' | 'gloas';

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
  /** Execution layer fork name (if applicable) */
  executionName?: string;
  /** Combined consensus + execution name (e.g., "dencun" for deneb + cancun) */
  combinedName?: string;
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
    description:
      'Genesis fork - Launched the beacon chain proof-of-stake consensus layer at epoch 0 with validator staking',
  },
  altair: {
    version: 'altair',
    name: 'Altair',
    emoji: '🦅',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400',
    description: 'First upgrade - Introduced sync committees for light client support and increased penalties',
  },
  bellatrix: {
    version: 'bellatrix',
    name: 'Bellatrix',
    emoji: '🐼',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-400',
    description: 'The Merge - Transitioned Ethereum from proof-of-work to proof-of-stake consensus',
    executionName: 'paris',
    combinedName: 'merge',
  },
  capella: {
    version: 'capella',
    name: 'Capella',
    emoji: '🦉',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
    description: 'Shapella - Enabled validator withdrawals after 2+ years of staking (EIP-4895)',
    executionName: 'shanghai',
    combinedName: 'shapella',
  },
  deneb: {
    version: 'deneb',
    name: 'Deneb',
    emoji: '🐡',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400',
    description: 'Dencun - Introduced proto-danksharding with blob transactions, reducing L2 fees by ~90% (EIP-4844)',
    executionName: 'cancun',
    combinedName: 'dencun',
  },
  electra: {
    version: 'electra',
    name: 'Electra',
    emoji: '🦒',
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400',
    description:
      'Pectra - Increased max validator balance to 2048 ETH, enabling consolidation and compounding (EIP-7251)',
    executionName: 'prague',
    combinedName: 'pectra',
  },
  fulu: {
    version: 'fulu',
    name: 'Fulu',
    emoji: '🦓',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-400/10 dark:text-pink-400',
    description:
      'Fusaka - Implements PeerDAS for up to 8x blob throughput scaling (EIP-7594) and introduces blob parameter-only forks (EIP-7892)',
    executionName: 'osaka',
    combinedName: 'fusaka',
  },
  gloas: {
    version: 'gloas',
    name: 'Gloas',
    emoji: '🐋',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400',
    description:
      'Glamsterdam - Enshrines proposer-builder separation, splitting the execution payload from the block with a Payload Timeliness Committee (EIP-7732), and adds fork-choice enforced inclusion lists (EIP-7805)',
    executionName: 'amsterdam',
    combinedName: 'glamsterdam',
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
  const activeFork = getActiveFork(network, epoch);

  return activeFork?.name ?? 'phase0';
}
