export interface DataColumnFirstSeenPoint {
  /**
   * Data column ID (0-127)
   */
  columnId: number;
  /**
   * Time in milliseconds when this column was first seen
   */
  time: number;
  /**
   * Color for visualization
   */
  color?: string;
}

export interface DataColumnDataAvailabilityProps {
  /**
   * Number of blobs in this slot (0-72)
   * Determines the number of rows in the heatmap
   */
  blobCount: number;
  /**
   * First seen data points for each data column (128 columns total)
   * Each point represents when a specific column was first seen
   * This data is replicated across all blob rows in the visualization
   *
   * Color scheme is based on 4000ms deadline:
   * - 0-1000ms: Green (very early)
   * - 1000-2000ms: Lime (early)
   * - 2000-3000ms: Yellow (on time)
   * - 3000-4000ms: Orange (cutting it close)
   * - >4000ms: Red (missed deadline)
   */
  firstSeenData?: DataColumnFirstSeenPoint[];
  /**
   * Current time in milliseconds from slot start (0-12000)
   * Only data up to this time will be rendered
   * @default maxTime (shows all data)
   */
  currentTime?: number;
  /**
   * Maximum time value for color scale (in milliseconds)
   * @default 12000
   */
  maxTime?: number;
  /**
   * Optional className for styling
   */
  className?: string;
}
