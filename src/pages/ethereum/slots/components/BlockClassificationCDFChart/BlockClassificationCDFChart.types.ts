/**
 * Block propagation data point from the first seen by node API endpoint
 */
export interface BlockClassificationCDFDataPoint {
  /**
   * Milliseconds from slot start when node first saw the block
   */
  seen_slot_start_diff: number;
  /**
   * Classification of the node (e.g., "individual", "corporate", "internal")
   */
  classification?: string;
}

/**
 * Props for BlockClassificationCDFChart component
 */
export interface BlockClassificationCDFChartProps {
  /**
   * Array of block propagation data points with classification info
   */
  blockPropagationData: BlockClassificationCDFDataPoint[];
}
