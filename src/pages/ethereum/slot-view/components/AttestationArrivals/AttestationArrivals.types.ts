export interface AttestationDataPoint {
  /** Time in milliseconds from slot start */
  time: number;
  /** Number of attestations at this time */
  count: number;
}

export interface AttestationArrivalsProps {
  /** Current time in milliseconds from slot start (0-12000) */
  currentTime: number;
  /** Pre-computed chart values (241 data points, null for future times) */
  attestationChartValues: (number | null)[];
  /** Total number of expected attestations (for percentage calculation) */
  totalExpected: number;
  /** Optional class name for the container */
  className?: string;
}
