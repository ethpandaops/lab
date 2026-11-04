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
  /** Optional: Whether the parent row is disabled (e.g., slot with no blobs) */
  rowDisabled?: boolean;
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
 * - epoch: Single epoch or slot - shows slots × columns
 */
export type DataAvailabilityGranularity = 'window' | 'day' | 'hour' | 'epoch';

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
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Layout orientation (default: 'vertical') */
  orientation?: 'vertical' | 'horizontal';
}
