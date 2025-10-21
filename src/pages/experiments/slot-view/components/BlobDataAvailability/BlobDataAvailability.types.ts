export interface BlobDataPoint {
  /**
   * Time in seconds
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
   * Time in seconds
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
   * First seen data points for scatter chart
   */
  firstSeenData?: BlobDataPoint[];
  /**
   * Data availability rate over time
   */
  availabilityRateData?: DataAvailabilityRatePoint[];
  /**
   * Continental propagation data - CDF per continent
   */
  continentalPropagationData?: ContinentalPropagationSeries[];
  /**
   * Current time in seconds from slot start (0-12)
   * Only data up to this time will be rendered
   * @default maxTime (shows all data)
   */
  currentTime?: number;
  /**
   * Maximum time value for x-axis (in seconds)
   * @default 12
   */
  maxTime?: number;
  /**
   * Optional className for styling
   */
  className?: string;
}
