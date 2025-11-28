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
   * Pre-computed and deduplicated blob data (already filtered to the active slot time)
   */
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  /**
   * Pre-computed continental propagation data (already filtered to the active slot time)
   */
  visibleContinentalPropagationData: ContinentalPropagationSeries[];
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
