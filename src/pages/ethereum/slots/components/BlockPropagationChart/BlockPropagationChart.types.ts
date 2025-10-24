/**
 * Block propagation data point from the first seen by node API endpoint
 */
export interface BlockPropagationDataPoint {
  /**
   * Milliseconds from slot start when node first saw the block
   */
  seen_slot_start_diff: number;
  /**
   * Unique identifier for the node
   */
  node_id: string;
  /**
   * Geographic continent code (e.g., 'EU', 'NA', 'AS', 'OC', 'SA', 'AF', 'AN')
   * @optional
   */
  meta_client_geo_continent_code?: string;
}

/**
 * Props for BlockPropagationChart component
 */
export interface BlockPropagationChartProps {
  /**
   * Array of block propagation data points from fct_block_first_seen_by_node
   */
  blockPropagationData: BlockPropagationDataPoint[];
}
