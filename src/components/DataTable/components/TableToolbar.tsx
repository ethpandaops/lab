import { type JSX } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ViewColumnsIcon } from '@heroicons/react/20/solid';
import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import type { Table } from '@tanstack/react-table';
import { Checkbox } from '@/components/Forms/Checkbox';
import { SelectMenu } from '@/components/Forms/SelectMenu';

interface TableToolbarProps<TData> {
  table: Table<TData>;
  hideColumnVisibility?: boolean;
  position?: 'top' | 'bottom';
  /** For cursor-based pagination when total count is unknown */
  hasNextPage?: boolean;
}

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

/**
 * Unified toolbar combining column visibility and pagination controls
 */
export function TableToolbar<TData>({
  table,
  hideColumnVisibility = false,
  position = 'top',
  hasNextPage,
}: TableToolbarProps<TData>): JSX.Element {
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  // For cursor-based pagination, use hasNextPage prop; otherwise use table's method
  const canPreviousPage = currentPage > 0;
  const canNextPage = hasNextPage !== undefined ? hasNextPage : table.getCanNextPage();

  // Calculate displayed rows
  const currentPageRows = table.getRowModel().rows.length;
  const startRow = currentPageRows > 0 ? currentPage * pageSize + 1 : 0;
  const endRow = currentPage * pageSize + currentPageRows;

  // Column visibility
  const allColumns = table.getAllColumns();
  const hideableColumns = allColumns.filter(column => column.getCanHide());
  const visibleCount = hideableColumns.filter(column => column.getIsVisible()).length;
  const totalCount = hideableColumns.length;

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-4 bg-surface/50 px-4 py-2 sm:px-6',
        position === 'top' ? 'border-b border-border' : 'border-t border-border'
      )}
    >
      {/* Left side: Column visibility + Results info */}
      <div className="flex items-center gap-4">
        {/* Column visibility dropdown */}
        {!hideColumnVisibility && hideableColumns.length > 0 && (
          <Menu as="div" className="relative">
            <MenuButton
              className={clsx(
                'flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium transition-colors',
                'border border-border bg-background text-muted hover:border-primary/50 hover:text-foreground'
              )}
            >
              <ViewColumnsIcon className="size-3.5" />
              <span className="hidden sm:inline">Columns</span>
              <span className="tabular-nums">
                ({visibleCount}/{totalCount})
              </span>
            </MenuButton>

            <MenuItems
              transition
              className={clsx(
                'absolute left-0 z-10 mt-1 w-56 origin-top-left border border-border bg-surface shadow-lg',
                'data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out',
                'data-leave:duration-75 data-leave:ease-in',
                'focus:outline-hidden'
              )}
            >
              <div className="py-1">
                {/* Show All / Hide All */}
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                  <button
                    onClick={() => table.toggleAllColumnsVisible(true)}
                    className="text-xs text-muted transition-colors hover:text-foreground"
                  >
                    Show all
                  </button>
                  <button
                    onClick={() => table.toggleAllColumnsVisible(false)}
                    className="text-xs text-muted transition-colors hover:text-foreground"
                  >
                    Hide all
                  </button>
                </div>

                {/* Column toggles */}
                <div className="max-h-[300px] overflow-y-auto">
                  {hideableColumns.map(column => (
                    <button
                      key={column.id}
                      type="button"
                      onClick={() => column.toggleVisibility()}
                      className={clsx(
                        'flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                        'hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      <Checkbox
                        checked={column.getIsVisible()}
                        onChange={() => {}}
                        rounded
                        className="pointer-events-none"
                      />
                      <span className="truncate select-none">
                        {typeof column.columnDef.header === 'string'
                          ? column.columnDef.header
                          : column.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </MenuItems>
          </Menu>
        )}

        {/* Results info */}
        <div className="text-xs text-muted">
          {currentPageRows > 0 ? (
            <>
              <span className="font-medium text-foreground">{startRow}</span>
              <span className="mx-0.5">-</span>
              <span className="font-medium text-foreground">{endRow}</span>
            </>
          ) : (
            'No results'
          )}
        </div>
      </div>

      {/* Right side: Page size + Navigation */}
      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs text-muted sm:inline">Rows:</span>
          <SelectMenu
            value={pageSize}
            onChange={(value: number) => table.setPageSize(value)}
            options={PAGE_SIZE_OPTIONS}
            expandToFit
            rounded
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!canPreviousPage}
            className={clsx(
              'flex items-center justify-center rounded-sm p-1 transition-colors',
              canPreviousPage ? 'text-muted hover:bg-primary/10 hover:text-primary' : 'cursor-not-allowed text-muted/30'
            )}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!canNextPage}
            className={clsx(
              'flex items-center justify-center rounded-sm p-1 transition-colors',
              canNextPage ? 'text-muted hover:bg-primary/10 hover:text-primary' : 'cursor-not-allowed text-muted/30'
            )}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
