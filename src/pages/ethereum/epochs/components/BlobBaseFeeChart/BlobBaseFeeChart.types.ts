import type { BlockProductionDataPoint } from '../../hooks/useEpochDetailData.types';

export interface BlobBaseFeeChartProps {
  /**
   * Block production data points for each slot in the epoch
   */
  data: BlockProductionDataPoint[];

  /**
   * Anchor ID for linking
   */
  anchorId?: string;
}
