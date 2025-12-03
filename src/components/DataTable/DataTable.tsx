import { type JSX, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import type { DataTableProps, DataTableColumnMeta } from './DataTable.types';
import { ColumnFilter } from './components/ColumnFilter';
import { TableToolbar } from './components/TableToolbar';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Input } from '@/components/Forms/Input';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  // Pagination
  pageSize: controlledPageSize,
  pageIndex: controlledPageIndex,
  pageCount: controlledPageCount,
  onPaginationChange,
  // Filtering
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,
  globalFilter: controlledGlobalFilter,
  onGlobalFilterChange,
  // Sorting
  sorting: controlledSorting,
  onSortingChange,
  // Column visibility
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  // Row actions
  onRowClick,
  getRowId,
  // Manual mode
  manualPagination = false,
  manualFiltering = false,
  manualSorting = false,
  // For cursor-based pagination
  hasNextPage,
  // Appearance
  emptyMessage = 'No data available',
  title,
  description,
  // Toolbar options
  hideGlobalFilter = false,
  hideColumnVisibility = false,
  // Pagination position
  paginationPosition = 'bottom',
}: DataTableProps<TData>): JSX.Element {
  // Internal state (used when not controlled)
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: controlledPageIndex ?? 0,
    pageSize: controlledPageSize ?? 10,
  });
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>(controlledColumnFilters ?? []);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState<string>(controlledGlobalFilter ?? '');
  const [internalSorting, setInternalSorting] = useState<SortingState>(controlledSorting ?? []);
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>(
    controlledColumnVisibility ?? {}
  );

  // Use controlled state if provided, otherwise use internal state
  const pagination = useMemo(
    () =>
      controlledPageIndex !== undefined && controlledPageSize !== undefined
        ? { pageIndex: controlledPageIndex, pageSize: controlledPageSize }
        : internalPagination,
    [controlledPageIndex, controlledPageSize, internalPagination]
  );

  const columnFilters = controlledColumnFilters ?? internalColumnFilters;
  const globalFilter = controlledGlobalFilter ?? internalGlobalFilter;
  const sorting = controlledSorting ?? internalSorting;
  const columnVisibility = controlledColumnVisibility ?? internalColumnVisibility;

  // Handle state changes
  const handlePaginationChange = (updater: PaginationState | ((old: PaginationState) => PaginationState)): void => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    if (onPaginationChange) {
      onPaginationChange(newPagination.pageIndex, newPagination.pageSize);
    } else {
      setInternalPagination(newPagination);
    }
  };

  const handleColumnFiltersChange = (
    updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)
  ): void => {
    const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
    if (onColumnFiltersChange) {
      onColumnFiltersChange(newFilters);
    } else {
      setInternalColumnFilters(newFilters);
    }
  };

  const handleGlobalFilterChange = (updater: string | ((old: string) => string)): void => {
    const newFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
    if (onGlobalFilterChange) {
      onGlobalFilterChange(newFilter);
    } else {
      setInternalGlobalFilter(newFilter);
    }
  };

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)): void => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    if (onSortingChange) {
      onSortingChange(newSorting);
    } else {
      setInternalSorting(newSorting);
    }
  };

  const handleColumnVisibilityChange = (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState)
  ): void => {
    const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(newVisibility);
    } else {
      setInternalColumnVisibility(newVisibility);
    }
  };

  // Initialize table
  const table = useReactTable({
    data,
    // Cast columns to the expected type - our DataTableColumn extends ColumnDef with custom meta
    columns: columns as Parameters<typeof useReactTable<TData>>[0]['columns'],
    // State
    state: {
      pagination,
      columnFilters,
      globalFilter,
      sorting,
      columnVisibility,
    },
    // State handlers
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    // Row model
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    // Manual control
    manualPagination,
    manualFiltering,
    manualSorting,
    pageCount: controlledPageCount,
    // Row ID
    getRowId: getRowId as ((row: TData, index: number) => string) | undefined,
    // Enable features
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableSorting: true,
  });

  // Check if any column has filters enabled
  const hasFilterableColumns = columns.some(col => col.meta?.filterType);

  return (
    <div className="w-full">
      {/* Header section */}
      {(title || description) && (
        <div className="mb-4 px-4 sm:px-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="sm:flex-auto">
              {title && <h1 className="text-base/7 font-semibold text-foreground">{title}</h1>}
              {description && <p className="mt-2 text-sm/6 text-muted">{description}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Global search (if enabled) */}
      {!hideGlobalFilter && (
        <div className="mb-4 px-4 sm:px-6">
          <div className="sm:max-w-xs">
            <Input size="sm">
              <Input.Leading>
                <MagnifyingGlassIcon />
              </Input.Leading>
              <Input.Field
                type="text"
                value={globalFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleGlobalFilterChange(e.target.value)}
                placeholder="Search..."
              />
            </Input>
          </div>
        </div>
      )}

      {/* Table container with unified toolbar */}
      <div className="overflow-hidden border-y border-border">
        {/* Unified toolbar (top) - columns + pagination */}
        {!isLoading &&
          table.getRowModel().rows.length > 0 &&
          (paginationPosition === 'top' || paginationPosition === 'both') && (
            <TableToolbar
              table={table}
              hideColumnVisibility={hideColumnVisibility}
              position="top"
              hasNextPage={hasNextPage}
            />
          )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            {/* Table head */}
            <thead className="bg-surface">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, headerIndex) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={clsx(
                          'py-3.5 text-left text-sm font-semibold text-foreground',
                          headerIndex === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                        )}
                      >
                        <div className="flex flex-col gap-2">
                          {/* Header content with sort */}
                          <div className="flex items-center gap-2">
                            {canSort ? (
                              <button
                                onClick={header.column.getToggleSortingHandler()}
                                className={clsx(
                                  'group flex items-center gap-1.5 transition-colors select-none',
                                  'hover:text-primary'
                                )}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <span className="flex flex-col">
                                  <ChevronUpIcon
                                    className={clsx(
                                      '-mb-1 size-3 transition-colors',
                                      isSorted === 'asc' ? 'text-primary' : 'text-muted group-hover:text-primary/50'
                                    )}
                                  />
                                  <ChevronDownIcon
                                    className={clsx(
                                      '-mt-1 size-3 transition-colors',
                                      isSorted === 'desc' ? 'text-primary' : 'text-muted group-hover:text-primary/50'
                                    )}
                                  />
                                </span>
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </div>

                          {/* Column filter */}
                          {hasFilterableColumns && header.column.getCanFilter() && (
                            <ColumnFilter column={header.column} />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* Table body */}
            <tbody className="divide-y divide-border bg-surface">
              {isLoading ? (
                // Loading state
                <tr>
                  <td colSpan={columns.length} className="py-8">
                    <div className="flex flex-col gap-2">
                      {[...Array(5)].map((_, i) => (
                        <LoadingContainer key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center">
                    <p className="text-sm text-muted">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                // Data rows
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={clsx('transition-colors', onRowClick && 'cursor-pointer hover:bg-background')}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td
                        key={cell.id}
                        className={clsx(
                          'py-4 text-sm whitespace-nowrap',
                          cellIndex === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3',
                          (cell.column.columnDef.meta as DataTableColumnMeta | undefined)?.cellClassName || 'text-muted'
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Unified toolbar (bottom) - columns + pagination */}
        {!isLoading &&
          table.getRowModel().rows.length > 0 &&
          (paginationPosition === 'bottom' || paginationPosition === 'both') && (
            <TableToolbar
              table={table}
              hideColumnVisibility={hideColumnVisibility}
              position="bottom"
              hasNextPage={hasNextPage}
            />
          )}
      </div>
    </div>
  );
}
