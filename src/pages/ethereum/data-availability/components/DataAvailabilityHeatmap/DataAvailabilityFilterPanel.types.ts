import type { ViewMode } from './DataAvailabilityHeatmap.types';

export interface DataAvailabilityFilters {
  /** Selected column subnet groups (0-31, 32-63, 64-95, 96-127) */
  columnGroups: Set<number>;
  /** Minimum availability percentage (0-100) */
  minAvailability: number;
  /** Maximum availability percentage (0-100) */
  maxAvailability: number;
  /** Minimum observation count to show a cell */
  minObservationCount: number;
}

export interface DataAvailabilityFilterPanelProps {
  /** Current filter values */
  filters: DataAvailabilityFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: DataAvailabilityFilters) => void;
  /** Whether to show the panel open by default */
  defaultOpen?: boolean;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Threshold value for threshold mode */
  threshold?: number;
  /** Callback when threshold changes */
  onThresholdChange?: (threshold: number) => void;
}
