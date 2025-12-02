import type { ReactNode } from 'react';

/**
 * Cell size variants for the grid
 */
export type GridCellSize = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Generic cell data structure - columnIndex + arbitrary data payload
 */
export interface GridCell<T = unknown> {
  /** Column index for this cell */
  columnIndex: number;
  /** Arbitrary data payload for the cell */
  data: T;
}

/**
 * Generic row data structure
 */
export interface GridRow<T = unknown> {
  /** Unique identifier for this row */
  identifier: string;
  /** Display label for the row */
  label: string;
  /** Cells in this row */
  cells: GridCell<T>[];
}

/**
 * Props passed to cell render function
 */
export interface CellRenderProps {
  /** Whether this cell is in the selected column */
  isSelected: boolean;
  /** Whether this cell is highlighted (hover preview) */
  isHighlighted: boolean;
  /** Whether this cell should be dimmed */
  isDimmed: boolean;
  /** Cell size variant */
  size: GridCellSize;
  /** Click handler for the cell */
  onClick?: () => void;
}

/**
 * Props for the GridHeatmap component
 */
export interface GridHeatmapProps<T = unknown> {
  /** Rows of data to display */
  rows: GridRow<T>[];
  /** Optional: Cell size (default: '2xs') */
  cellSize?: GridCellSize;
  /** Optional: Show column indices header (default: true) */
  showColumnHeader?: boolean;
  /** Optional: Callback when a row label is clicked */
  onRowClick?: (rowId: string) => void;
  /** Optional: Callback when back button is clicked */
  onBack?: () => void;
  /** Render function for individual cells */
  renderCell: (cellData: T, props: CellRenderProps) => ReactNode;
  /** Optional: Render function for header content (legend, filters, etc.) */
  renderHeader?: () => ReactNode;
  /** Optional: Render function for column labels */
  renderColumnLabel?: (columnIndex: number, isHovered: boolean, isSelected: boolean) => ReactNode;
  /** Optional: X-axis title (displayed below column indices) */
  xAxisTitle?: string;
  /** Optional: Y-axis title (displayed vertically on the left) */
  yAxisTitle?: string;
  /** Optional: Custom class name */
  className?: string;
}
