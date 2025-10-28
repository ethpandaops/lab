/**
 * Aggregated statistics for an entity
 */
export interface EntityStats {
  /** Entity name */
  entity: string;
  /** 7-day attestation success rate (0-1) */
  rate7d: number;
  /** 30-day attestation success rate (0-1) */
  rate30d: number;
  /** All-time attestation success rate (0-1) */
  rateAllTime: number;
  /** Total attestations (7 days) */
  totalAttestations7d: number;
  /** Missed attestations (7 days) */
  missedAttestations7d: number;
  /** Total attestations (30 days) */
  totalAttestations30d: number;
  /** Missed attestations (30 days) */
  missedAttestations30d: number;
  /** Total attestations (all time) */
  totalAttestationsAllTime: number;
  /** Missed attestations (all time) */
  missedAttestationsAllTime: number;
  /** Total blocks proposed (30 days) */
  blocksProposed30d: number;
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
