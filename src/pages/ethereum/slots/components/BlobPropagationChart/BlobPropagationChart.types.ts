/**
 * Blob or data column propagation data point from the first seen by node API endpoint
 * Pre-Fulu uses blob_index, Fulu+ uses column_index
 */
export interface BlobPropagationDataPoint {
  /**
   * Blob index (pre-Fulu: 0-5, typically 0-3)
   */
  blob_index?: number;
  /**
   * Data column index (Fulu+: 0-127)
   */
  column_index?: number;
  /**
   * Milliseconds from slot start when node first saw the blob/data column
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
 * Props for BlobPropagationChart component
 */
export interface BlobPropagationChartProps {
  /**
   * Array of blob propagation data points from fct_block_blob_first_seen_by_node
   */
  blobPropagationData: BlobPropagationDataPoint[];
}
