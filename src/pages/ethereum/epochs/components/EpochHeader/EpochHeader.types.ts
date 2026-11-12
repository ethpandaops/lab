import type { EpochStats } from '@/pages/ethereum/epochs/hooks';

/**
 * Props for EpochHeader component
 */
export interface EpochHeaderProps {
  /** Epoch number */
  epoch: number;

  /** Epoch statistics */
  stats: EpochStats;

  /** Epoch start timestamp (Unix seconds) */
  timestamp: number;
}
