export interface AttestationDataPoint {
  /** Time in milliseconds from slot start */
  time: number;
  /** Number of attestations at this time */
  count: number;
}

export interface AttestationArrivalsProps {
  /** Pre-computed chart values (241 data points, null for future times) */
  attestationChartValues: (number | null)[];
  /** Gloas (ePBS): PTC payload attestation arrivals, rendered as a second chart when present */
  payloadAttestationChartValues?: (number | null)[];
  /** Total number of expected attestations (for percentage calculation) */
  totalExpected: number;
  /** Maximum count across all data points (for yMax scaling) */
  maxCount: number;
  /** Optional class name for the container */
  className?: string;
}
