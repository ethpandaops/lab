import type { BlockDetailsData } from '../../hooks/useBlockDetailsData';

export interface BlockDetailsCardProps {
  data: BlockDetailsData | null;
  /** Current time in milliseconds from slot start (0-12000) - optional for attestation progress */
  currentTime?: number;
  /** Pre-computed attestation count up to currentTime */
  attestationCount: number;
  /** Pre-computed attestation percentage up to currentTime */
  attestationPercentage: number;
  /** Total number of expected attestations - optional for attestation progress */
  attestationTotalExpected?: number;
}
