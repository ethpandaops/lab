/**
 * Blob or data column propagation data point from the first seen by node API endpoint
 * Pre-Fulu uses blob_index, Fulu+ uses column_index
 */
export interface BlobDataColumnPropagationDataPoint {
  /**
   * Blob index (pre-Fulu forks: Deneb, Electra)
   */
  blob_index?: number;
  /**
   * Data column index (Fulu fork and later)
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
 * Props for BlobDataColumnSpreadChart component
 */
export interface BlobDataColumnSpreadChartProps {
  /**
   * Array of blob/data column propagation data points
   */
  blobPropagationData: BlobDataColumnPropagationDataPoint[];
  /**
   * Slot number to determine active fork
   */
  slot: number;
}

/**
 * Spread statistics for a single blob or data column
 */
export interface SpreadStats {
  /**
   * Blob or data column index
   */
  index: number;
  /**
   * Minimum time observed (first node to see first blob/column)
   */
  minTime: number;
  /**
   * Maximum time observed (last node to see last blob/column)
   */
  maxTime: number;
  /**
   * Spread in milliseconds (max - min)
   */
  spread: number;
  /**
   * Number of observations for this blob/column
   */
  observationCount: number;
}

/**
 * Per-node spread statistics
 */
export interface NodeSpreadStats {
  /**
   * Node identifier
   */
  nodeId: string;
  /**
   * Minimum time this node saw any blob/column
   */
  minTime: number;
  /**
   * Maximum time this node saw any blob/column
   */
  maxTime: number;
  /**
   * Spread for this node (max - min)
   */
  spread: number;
  /**
   * Number of blobs/columns observed by this node
   */
  observationCount: number;
}
