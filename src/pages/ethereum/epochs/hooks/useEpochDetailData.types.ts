/**
 * Data for a single slot within an epoch
 */
export interface SlotData {
  /** Slot number */
  slot: number;
  /** Slot start timestamp (Unix seconds) */
  slotStartDateTime: number;
  /** Block root (null if missed) */
  blockRoot: string | null;
  /** Proposer validator index */
  proposerIndex: number | null;
  /** Proposer entity name */
  proposerEntity: string | null;
  /** Number of blobs in the block */
  blobCount: number;
  /** Block status (canonical, orphaned, missed) */
  status: string;
  /** Attestations for this slot */
  attestationHead: number;
  /** Other attestations */
  attestationOther: number;
  /** Maximum possible attestations */
  attestationMax: number;
  /** First time block was seen by any node (ms from slot start) */
  blockFirstSeenTime: number | null;
}

/**
 * Missed attestations by entity for a single slot
 */
export interface SlotMissedAttestationEntity {
  /** Slot number */
  slot: number;
  /** Entity name */
  entity: string;
  /** Number of missed attestations */
  count: number;
}

/**
 * Aggregated epoch statistics
 */
export interface EpochStats {
  /** Epoch number */
  epoch: number;
  /** Epoch start timestamp (Unix seconds) */
  epochStartDateTime: number;
  /** Total canonical blocks */
  canonicalBlockCount: number;
  /** Total missed blocks */
  missedBlockCount: number;
  /** Total orphaned blocks */
  orphanedBlockCount: number;
  /** Total attestations */
  totalAttestations: number;
  /** Expected attestations */
  expectedAttestations: number;
  /** Missed attestations */
  missedAttestations: number;
  /** Participation rate (0-1) */
  participationRate: number;
  /** Average block first seen time (ms from slot start) */
  averageBlockFirstSeenTime: number | null;
}

/**
 * MEV data point for time series
 */
export interface MevDataPoint {
  /** Slot number */
  slot: number;
  /** Whether this slot used MEV */
  hasMev: boolean;
  /** Builder name (if MEV) */
  builder: string | null;
  /** Relay name (if MEV) */
  relay: string | null;
  /** Block value in wei (if MEV) */
  blockValue: string | null;
}

/**
 * Block production quality data point for time series
 */
export interface BlockProductionDataPoint {
  /** Slot number */
  slot: number;
  /** Number of blobs */
  blobCount: number;
  /** Gas used */
  gasUsed: number | null;
  /** Gas limit */
  gasLimit: number | null;
  /** Transaction count */
  transactionCount: number | null;
  /** Base fee per gas in gwei */
  baseFeePerGas: number | null;
  /** Blob gas used */
  blobGasUsed: number | null;
  /** Excess blob gas (used to calculate blob base fee) */
  excessBlobGas: number | null;
}

/**
 * Block size data point for time series
 */
export interface BlockSizeDataPoint {
  /** Slot number */
  slot: number;
  /** Total beacon block size in bytes (uncompressed) */
  consensusSize: number | null;
  /** Total beacon block size in bytes (compressed) */
  consensusSizeCompressed: number | null;
  /** Execution payload transactions size in bytes (uncompressed) */
  executionSize: number | null;
  /** Execution payload transactions size in bytes (compressed) */
  executionSizeCompressed: number | null;
}

/**
 * Complete epoch detail data
 */
export interface EpochDetailData {
  /** Epoch statistics */
  stats: EpochStats;
  /** All slots in the epoch */
  slots: SlotData[];
  /** Missed attestations by entity for all slots */
  missedAttestationsByEntity: SlotMissedAttestationEntity[];
  /** Top 10 entities by total missed attestations across epoch */
  topMissedEntities: Array<{ entity: string; count: number }>;
  /** MEV data time series */
  mevTimeSeries: MevDataPoint[];
  /** Block production quality time series */
  blockProductionTimeSeries: BlockProductionDataPoint[];
  /** Block size time series */
  blockSizeTimeSeries: BlockSizeDataPoint[];
}

/**
 * Return type for useEpochDetailData hook
 */
export interface UseEpochDetailDataReturn {
  /** Epoch detail data */
  data: EpochDetailData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}
