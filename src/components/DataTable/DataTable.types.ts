import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export type FilterType = 'text' | 'select' | 'multi-select' | 'number-range' | 'date-range';

export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface DataTableColumnMeta {
  filterType?: FilterType;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  headerIcon?: ReactNode;
  cellClassName?: string;
  enableHiding?: boolean;
}

// Use type alias with intersection since ColumnDef is a union type and can't be extended by interface
export type DataTableColumn<TData> = ColumnDef<TData, unknown> & {
  meta?: DataTableColumnMeta;
};

export interface DataTableProps<TData> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  isLoading?: boolean;
  // Pagination
  pageSize?: number;
  pageIndex?: number;
  pageCount?: number;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  // Filtering
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  // Sorting
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  // Column visibility
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  // Row selection and actions
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  // Manual mode (server-side)
  manualPagination?: boolean;
  manualFiltering?: boolean;
  manualSorting?: boolean;
  // Appearance
  emptyMessage?: string;
  title?: string;
  description?: string;
}
