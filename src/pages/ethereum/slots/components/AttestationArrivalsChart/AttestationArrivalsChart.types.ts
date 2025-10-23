/**
 * Attestation data point from the chunked 50ms API endpoint
 */
export interface AttestationDataPoint {
  /**
   * Milliseconds from slot start (0-12000ms in 50ms increments)
   */
  chunk_slot_start_diff: number;
  /**
   * Number of attestations received in this 50ms window
   */
  attestation_count: number;
}

/**
 * Props for AttestationArrivalsChart component
 */
export interface AttestationArrivalsChartProps {
  /**
   * Array of attestation data points from fct_attestation_first_seen_chunked_50ms
   */
  attestationData: AttestationDataPoint[];
  /**
   * Total expected validators (from committee data) - used to show participation rate
   * @optional
   */
  totalExpectedValidators?: number;
}
