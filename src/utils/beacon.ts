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
