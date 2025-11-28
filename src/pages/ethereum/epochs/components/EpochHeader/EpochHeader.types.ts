import type { EpochStats } from '../../hooks';

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

  /** P95 block arrival time in seconds (optional, calculated from p90 data) */
  p95BlockArrivalTime?: number | null;
}
