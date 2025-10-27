import type { MissedAttestationByEntity } from '../../hooks';

/**
 * Props for MissedAttestationsByEpochChart component
 */
export interface MissedAttestationsByEpochChartProps {
  /** Missed attestations data grouped by entity and epoch */
  missedAttestationsByEntity: MissedAttestationByEntity[];
  /** Number of top entities to display (default: 10) */
  topEntitiesCount?: number;
  /** Anchor ID for deep linking to this chart */
  anchorId?: string;
}
