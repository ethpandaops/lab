import type { SlotPhase } from '@/components/Ethereum/SlotTimeline';

/**
 * Beacon chain timing constants
 */
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

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
    color: 'bg-primary',
    description: 'Proposer broadcasts block',
  },
  {
    label: 'Attestations',
    duration: 4,
    color: 'bg-success',
    description: 'Validators attest to block',
  },
  {
    label: 'Aggregations',
    duration: 4,
    color: 'bg-warning',
    description: 'Attestations aggregated',
  },
];
