/**
 * Aggregated statistics for an entity (12h)
 */
export interface EntityStats {
  /** Entity name */
  entity: string;
  /** 12h attestation success rate (0-1) */
  rate24h: number;
  /** Estimated validator count */
  validatorCount: number;
  /** Missed attestations (12h) */
  missedAttestations24h: number;
  /** Total blocks proposed (12h) */
  blocksProposed24h: number;
  /** Last active timestamp (Unix seconds) */
  lastActive: number;
}

/**
 * Epoch-aggregated data point for time series
 */
export interface EntityEpochData {
  /** Epoch number */
  epoch: number;
  /** Epoch start timestamp (Unix seconds) */
  epochStartDateTime: number;
  /** Total attestations in this epoch */
  totalAttestations: number;
  /** Missed attestations in this epoch */
  missedAttestations: number;
  /** Attestation success rate (0-1) */
  rate: number;
  /** Blocks proposed in this epoch */
  blocksProposed: number;
}

/**
 * Complete entity detail data
 */
export interface EntityDetailData {
  /** Entity statistics */
  stats: EntityStats;
  /** Time series data aggregated by epoch */
  epochData: EntityEpochData[];
}

/**
 * Return type for useEntityDetailData hook
 */
export interface UseEntityDetailDataReturn {
  /** Entity detail data */
  data: EntityDetailData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}
