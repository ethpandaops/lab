import type { ReactNode } from 'react';

export interface Column<T = unknown> {
  /**
   * The header text for this column
   */
  header: string;
  /**
   * How to access the data for this column
   * Can be a key of the data object or a function that returns a ReactNode
   */
  accessor: string | ((row: T) => ReactNode);
  /**
   * Optional additional CSS classes for table cells in this column
   */
  cellClassName?: string;
  /**
   * Optional additional CSS classes for the header cell
   */
  headerClassName?: string;
}

export interface TableProps<T = unknown> {
  /**
   * The data to display in the table
   */
  data: T[];
  /**
   * Column definitions for the table
   */
  columns: Column<T>[];
  /**
   * Optional title displayed above the table
   */
  title?: string;
  /**
   * Optional description displayed below the title
   */
  description?: string;
  /**
   * Variant for different use cases
   * - 'standalone': Full padding wrapper for page-level usage (default)
   * - 'nested': No outer padding, for use inside Cards or other containers
   */
  variant?: 'standalone' | 'nested';
  /**
   * Optional callback when a row is clicked
   */
  onRowClick?: (row: T, rowIndex: number) => void;
  /**
   * Optional function to generate custom className for each row
   */
  getRowClassName?: (row: T, rowIndex: number) => string;
  /**
   * Optional function to generate a unique key for each row
   */
  getRowKey?: (row: T, rowIndex: number) => string | number;
  /**
   * Optional function to generate custom style for each row
   */
  getRowStyle?: (row: T, rowIndex: number) => React.CSSProperties;
}
