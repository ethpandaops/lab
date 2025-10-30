import type { EntityEpochData } from '../../hooks';

/**
 * Props for RecentActivityTable component
 */
export interface RecentActivityTableProps {
  /** Recent epoch data for the entity */
  epochs: EntityEpochData[];
}
