import type { SlotMissedAttestationEntity } from '../../hooks';

/**
 * Props for MissedAttestationsBySlotChart component
 */
export interface MissedAttestationsBySlotChartProps {
  /** Epoch number */
  epoch: number;
  /** Missed attestations by entity for all slots */
  missedAttestationsByEntity: SlotMissedAttestationEntity[];
  /** Top entities to display (default: 10) */
  topEntitiesCount?: number;
  /** Anchor ID for scroll navigation */
  anchorId?: string;
}
