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
  /** Duration of this phase in seconds */
  duration: number;
  /** Tailwind classes to apply to this phase (e.g., 'bg-primary', 'bg-success border-2') */
  className: string;
  /** Optional description for accessibility */
  description?: string;
}

/**
 * Default Ethereum beacon chain slot phases (12 seconds total).
 *
 * Based on standard beacon chain slot timing:
 * - 0-4s: Block Proposal - Proposer broadcasts the block
 * - 4-8s: Attestations - Validators attest to the block
 * - 8-12s: Aggregations - Attestations are aggregated
 */
export const DEFAULT_BEACON_SLOT_PHASES: SlotPhase[] = [
  {
    label: 'Block Proposal',
    duration: 4,
    className: 'bg-primary',
    description: 'Proposer broadcasts block',
  },
  {
    label: 'Attestations',
    duration: 4,
    className: 'bg-success',
    description: 'Validators attest to block',
  },
  {
    label: 'Aggregations',
    duration: 4,
    className: 'bg-warning',
    description: 'Attestations aggregated',
  },
];
