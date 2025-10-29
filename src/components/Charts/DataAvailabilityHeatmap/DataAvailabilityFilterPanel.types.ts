export interface DataAvailabilityFilters {
  /** Selected column subnet groups (0-31, 32-63, 64-95, 96-127) */
  columnGroups: Set<number>;
  /** Minimum availability percentage (0-100) */
  minAvailability: number;
  /** Maximum availability percentage (0-100) */
  maxAvailability: number;
  /** Minimum probe count to show a cell */
  minProbeCount: number;
}

export interface DataAvailabilityFilterPanelProps {
  /** Current filter values */
  filters: DataAvailabilityFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: DataAvailabilityFilters) => void;
  /** Whether to show the panel open by default */
  defaultOpen?: boolean;
}
