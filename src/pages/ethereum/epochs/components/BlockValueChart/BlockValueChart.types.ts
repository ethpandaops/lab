import type { MevDataPoint } from '../../hooks/useEpochDetailData.types';

export interface BlockValueChartProps {
  /**
   * MEV data points for each slot in the epoch
   */
  data: MevDataPoint[];

  /**
   * Anchor ID for linking
   */
  anchorId?: string;
}
