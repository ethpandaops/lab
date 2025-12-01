import { type JSX } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import type { Table } from '@tanstack/react-table';
import { Button } from '@/components/Elements/Button';
import { SelectMenu } from '@/components/Forms/SelectMenu';

interface PaginationProps<TData> {
  table: Table<TData>;
}

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

export function Pagination<TData>({ table }: PaginationProps<TData>): JSX.Element {
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();

  // Calculate displayed rows
  const totalRows = table.getFilteredRowModel().rows.length;
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);

  // Generate page buttons (show max 7 pages)
  const getPageButtons = (): number[] => {
    const pages: number[] = [];
    const maxButtons = 7;

    if (pageCount <= maxButtons) {
      // Show all pages
      for (let i = 0; i < pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current, and surrounding pages
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, pageCount - 2);

      const showLeftDots = leftSiblingIndex > 1;
      const showRightDots = rightSiblingIndex < pageCount - 2;

      // Always show first page
      pages.push(0);

      if (showLeftDots) {
        pages.push(-1); // Ellipsis marker
      }

      // Show current page and siblings
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }

      if (showRightDots) {
        pages.push(-1); // Ellipsis marker
      }

      // Always show last page
      if (pageCount > 1) {
        pages.push(pageCount - 1);
      }
    }

    return pages;
  };

  const pageButtons = getPageButtons();

  return (
    <div className="flex flex-col gap-4 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      {/* Rows info and page size selector */}
      <div className="flex flex-1 items-center gap-4">
        <div className="text-sm text-muted">
          {totalRows > 0 ? (
            <>
              Showing <span className="font-medium text-foreground">{startRow}</span> to{' '}
              <span className="font-medium text-foreground">{endRow}</span> of{' '}
              <span className="font-medium text-foreground">{totalRows}</span> results
            </>
          ) : (
            'No results'
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Rows per page:</span>
          <SelectMenu
            value={pageSize}
            onChange={(value: number) => table.setPageSize(value)}
            options={PAGE_SIZE_OPTIONS}
            expandToFit
            rounded
          />
        </div>
      </div>

      {/* Page navigation */}
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {/* Previous button */}
          <Button
            variant="outline"
            size="sm"
            rounded="md"
            onClick={() => table.previousPage()}
            disabled={!canPreviousPage}
            iconOnly
            leadingIcon={<ChevronLeftIcon />}
          />

          {/* Page buttons */}
          <div className="hidden items-center gap-1 sm:flex">
            {pageButtons.map((pageIndex, idx) => {
              if (pageIndex === -1) {
                // Ellipsis
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted">
                    ...
                  </span>
                );
              }

              const isActive = pageIndex === currentPage;

              return (
                <button
                  key={pageIndex}
                  onClick={() => table.setPageIndex(pageIndex)}
                  className={clsx(
                    'min-w-[32px] px-2 py-1 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-primary/10 hover:text-primary',
                    'rounded-md'
                  )}
                >
                  {pageIndex + 1}
                </button>
              );
            })}
          </div>

          {/* Mobile page info */}
          <div className="block text-sm text-muted sm:hidden">
            Page {currentPage + 1} of {pageCount}
          </div>

          {/* Next button */}
          <Button
            variant="outline"
            size="sm"
            rounded="md"
            onClick={() => table.nextPage()}
            disabled={!canNextPage}
            iconOnly
            leadingIcon={<ChevronRightIcon />}
          />
        </div>
      )}
    </div>
  );
}
