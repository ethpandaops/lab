import type { BlockDetailsData } from '../../hooks/useBlockDetailsData';
import type { AttestationDataPoint } from '../AttestationArrivals/AttestationArrivals.types';

export interface BlockDetailsCardProps {
  data: BlockDetailsData | null;
  /** Current time in milliseconds from slot start (0-12000) - optional for attestation progress */
  currentTime?: number;
  /** Attestation arrival data points - optional for attestation progress */
  attestationData?: AttestationDataPoint[];
  /** Total number of expected attestations - optional for attestation progress */
  attestationTotalExpected?: number;
}
