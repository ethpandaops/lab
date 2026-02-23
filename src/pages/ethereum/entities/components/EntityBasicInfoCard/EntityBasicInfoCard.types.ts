import type { EntityStats } from '../../hooks';

/**
 * Props for EntityBasicInfoCard component
 */
export interface EntityBasicInfoCardProps {
  /** Entity statistics */
  stats: EntityStats;
  /** Actual active validator count from daily table (overrides estimated count) */
  activeValidatorCount?: number;
  /** Total validator count across all statuses */
  totalValidatorCount?: number;
}
