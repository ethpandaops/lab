import type { BlockSizeDataPoint } from '../../hooks/useEpochDetailData.types';

export interface BlockSizeChartProps {
  /**
   * Block size data points for each slot in the epoch
   */
  data: BlockSizeDataPoint[];

  /**
   * Anchor ID for linking
   */
  anchorId?: string;
}
