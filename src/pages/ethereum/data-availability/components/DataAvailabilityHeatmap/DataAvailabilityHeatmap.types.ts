/**
 * Data availability metrics for a single cell in the heatmap
 */
export interface DataAvailabilityCellData {
  /** Unique identifier for the time period (day, epoch, or slot) */
  identifier: string;
  /** Column index (0-127 for PeerDAS) */
  columnIndex: number;
  /** Availability percentage (0-1) */
  availability: number;
  /** Optional: Number of successful custody observations */
  successCount?: number;
  /** Optional: Total number of custody observations */
  totalCount?: number;
  /** Optional: Average response time in milliseconds */
  avgResponseTimeMs?: number;
  /** Optional: Blob index (for slot-level view) */
  blobIndex?: number;
}

/**
 * Grouped data for a single time period (row in the heatmap)
 */
export interface DataAvailabilityRow {
  /** Unique identifier for the time period */
  identifier: string;
  /** Display label for the row (e.g., "Day 1", "Epoch 12345", "Slot 67890") */
  label: string;
  /** Cell data for each column in this row */
  cells: DataAvailabilityCellData[];
  /** Whether this row is disabled (e.g., slot with no blobs) */
  disabled?: boolean;
  /** Optional reason why the row is disabled (shown in tooltip) */
  disabledReason?: string;
}

/**
 * Granularity level for the heatmap
 * - window: 19-day custody window (top level) - shows days × columns
 * - day: Single day within the window - shows hours × columns
 * - hour: Single hour within a day - shows epochs × columns
 * - epoch: Single epoch within an hour - shows slots × columns
 * - slot: Single slot within an epoch - shows blobs × columns
 */
export type DataAvailabilityGranularity = 'window' | 'day' | 'hour' | 'epoch' | 'slot';

/**
 * View mode for data availability visualization
 * - 'percentage': Traditional success rate (successCount / totalCount) - sensitive to outliers
 * - 'threshold': Count-based view showing gradient based on successCount vs threshold - robust to outliers
 */
export type ViewMode = 'percentage' | 'threshold';

/**
 * Callback when a cell is clicked
 */
export interface CellClickHandler {
  (identifier: string, columnIndex: number): void;
}

/**
 * Callback when a column header is clicked (to view all rows for that column)
 */
export interface ColumnClickHandler {
  (columnIndex: number): void;
}

/**
 * Callback when a row label is clicked (to view all columns for that time period)
 */
export interface RowClickHandler {
  (identifier: string): void;
}

/**
 * Cell size variants
 */
export type CellSize = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Props for the DataAvailabilityHeatmap component
 */
export interface DataAvailabilityHeatmapProps {
  /** Rows of data to display */
  rows: DataAvailabilityRow[];
  /** Granularity level of the data */
  granularity: DataAvailabilityGranularity;
  /** Filter settings */
  filters: import('./DataAvailabilityFilterPanel.types').DataAvailabilityFilters;
  /** View mode: 'percentage' (default) or 'threshold' */
  viewMode?: ViewMode;
  /** Threshold value for threshold mode (default: 30 for mainnet, 10 for others) */
  threshold?: number;
  /** Callback when a row label is clicked */
  onRowClick?: RowClickHandler;
  /** Callback when a cell is clicked */
  onCellClick?: CellClickHandler;
  /** Callback when a column header is clicked */
  onColumnClick?: ColumnClickHandler;
  /** Optional: Callback when back button is clicked */
  onBack?: () => void;
  /** Optional: Cell size (default: '2xs' = 8px) */
  cellSize?: CellSize;
  /** Optional: Show column indices header */
  showColumnHeader?: boolean;
  /** Optional: Show legend */
  showLegend?: boolean;
  /** Optional: Show axis titles (default: true) */
  showAxisTitles?: boolean;
  /** Optional: Custom class name */
  className?: string;
}

/**
 * Props for individual cell component
 */
export interface DataAvailabilityCellProps {
  /** Cell data */
  data: DataAvailabilityCellData;
  /** Granularity level (determines response time label) */
  granularity?: DataAvailabilityGranularity;
  /** View mode: 'percentage' or 'threshold' */
  viewMode?: ViewMode;
  /** Threshold value for threshold mode */
  threshold?: number;
  /** Whether this cell is in the selected column */
  isSelected?: boolean;
  /** Whether this cell is highlighted (hover preview) */
  isHighlighted?: boolean;
  /** Whether this cell should be dimmed (when another column is selected) */
  isDimmed?: boolean;
  /** Cell size variant */
  size?: CellSize;
  /** Click handler */
  onClick?: () => void;
  /** Optional: Show tooltip on hover */
  showTooltip?: boolean;
}

/**
 * Props for the legend component
 */
export interface DataAvailabilityLegendProps {
  /** Granularity level for contextual labels (unused, kept for compatibility) */
  granularity?: DataAvailabilityGranularity;
  /** View mode: 'percentage' or 'threshold' */
  viewMode?: ViewMode;
  /** Threshold value for threshold mode (for display in legend) */
  threshold?: number;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Layout orientation (default: 'vertical') */
  orientation?: 'vertical' | 'horizontal';
}
