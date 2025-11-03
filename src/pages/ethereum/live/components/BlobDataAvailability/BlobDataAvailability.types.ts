export interface BlobDataPoint {
  /**
   * Time in milliseconds
   */
  time: number;
  /**
   * Blob identifier
   */
  blobId: string;
  /**
   * Color for visualization
   */
  color?: string;
}

export interface DataAvailabilityRatePoint {
  /**
   * Time in milliseconds
   */
  time: number;
  /**
   * Number of nodes
   */
  nodes: number;
}

export interface ContinentalPropagationSeries {
  /**
   * Continent name
   */
  continent: string;
  /**
   * Color for this continent's line
   */
  color?: string;
  /**
   * Time series data points (CDF)
   */
  data: Array<{
    time: number;
    percentage: number;
  }>;
}

export interface BlobDataAvailabilityProps {
  /**
   * Pre-computed and deduplicated blob data (already filtered to currentTime)
   */
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  /**
   * Pre-computed continental propagation data (already filtered to currentTime)
   */
  visibleContinentalPropagationData: ContinentalPropagationSeries[];
  /**
   * Current time in milliseconds from slot start (0-12000)
   * Only data up to this time will be rendered
   * @default maxTime (shows all data)
   */
  currentTime?: number;
  /**
   * Maximum time value for x-axis (in milliseconds)
   * @default 12000
   */
  maxTime?: number;
  /**
   * Which chart variant to display
   * @default 'both' - shows both charts side-by-side
   */
  variant?: 'both' | 'first-seen-only' | 'continental-only';
  /**
   * Optional className for styling
   */
  className?: string;
}
