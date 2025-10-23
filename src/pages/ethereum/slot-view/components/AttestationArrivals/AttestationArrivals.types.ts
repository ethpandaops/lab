export interface AttestationDataPoint {
  /** Time in milliseconds from slot start */
  time: number;
  /** Number of attestations at this time */
  count: number;
}

export interface AttestationArrivalsProps {
  /** Current time in milliseconds from slot start (0-12000) */
  currentTime: number;
  /** Attestation arrival data points */
  data: AttestationDataPoint[];
  /** Total number of expected attestations (for percentage calculation) */
  totalExpected: number;
  /** Optional class name for the container */
  className?: string;
}
