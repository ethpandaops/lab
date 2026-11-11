/**
 * Bucket definition for histogram
 */
export interface HistogramBucket {
  label: string;
  min: number;
  max: number;
}

export interface GasHistogramProps {
  /** Title for the card */
  title: string;
  /** Subtitle for the card */
  subtitle?: string;
  /** Array of gas values to bucket */
  values: number[];
  /** Custom bucket definitions (optional - uses defaults if not provided) */
  buckets?: HistogramBucket[];
  /** Y-axis label (default: "Count") */
  yAxisLabel?: string;
  /** Tooltip item label (default: "items") */
  tooltipLabel?: string;
}
