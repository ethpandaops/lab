import type { MevDataPoint } from '../../hooks';

/**
 * Props for MevAdoptionChart component
 */
export interface MevAdoptionChartProps {
  /** MEV data for all slots in epoch */
  data: MevDataPoint[];
  /** Anchor ID for deep linking */
  anchorId?: string;
}
