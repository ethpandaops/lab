/**
 * Data for a single epoch in the epochs list
 */
export interface EpochData {
  /** Epoch number */
  epoch: number;
  /** Epoch start timestamp (Unix seconds) */
  epochStartDateTime: number;
  /** Number of canonical blocks in this epoch */
  canonicalBlockCount: number;
  /** Number of missed blocks in this epoch */
  missedBlockCount: number;
  /** Total attestations in this epoch */
  totalAttestations: number;
  /** Missed attestations in this epoch */
  missedAttestations: number;
  /** Attestation participation rate (0-1) */
  participationRate: number;
}

/**
 * Missed attestation by entity for a single epoch
 */
export interface MissedAttestationByEntity {
  /** Entity name */
  entity: string;
  /** Epoch number */
  epoch: number;
  /** Total missed attestations for this entity in this epoch */
  count: number;
}

/**
 * Return type for useEpochsData hook
 */
export interface UseEpochsDataReturn {
  /** Array of epoch data */
  epochs: EpochData[];
  /** Missed attestations by entity across all epochs */
  missedAttestationsByEntity: MissedAttestationByEntity[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Current epoch number */
  currentEpoch: number;
}
