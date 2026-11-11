import type { JSX } from 'react';
import clsx from 'clsx';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { SelectMenu } from '@/components/Forms/SelectMenu';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100].map(value => ({ value, label: String(value) }));

export interface ListPaginationProps {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  onChange: (pageIndex: number, pageSize: number) => void;
  className?: string;
}

/**
 * Page position, page size and prev/next for lists that aren't a DataTable.
 * Matches the DataTable toolbar.
 */
export function ListPagination({
  pageIndex,
  pageSize,
  totalRows,
  onChange,
  className,
}: ListPaginationProps): JSX.Element {
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = totalRows > 0 ? pageIndex * pageSize + 1 : 0;
  const end = Math.min((pageIndex + 1) * pageSize, totalRows);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  const navClass = (enabled: boolean): string =>
    clsx(
      'flex items-center justify-center rounded-sm p-1 transition-colors',
      enabled ? 'text-muted hover:bg-primary-10 hover:text-primary' : 'cursor-not-allowed text-muted-30'
    );

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-4 border-t border-border bg-surface-50 px-3 py-2',
        className
      )}
    >
      <div className="text-xs text-muted">
        <span className="font-medium text-foreground tabular-nums">{start}</span>
        <span className="mx-0.5">-</span>
        <span className="font-medium text-foreground tabular-nums">{end}</span>
        <span className="mx-1">of</span>
        <span className="tabular-nums">{totalRows}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs text-muted sm:inline">Rows:</span>
          <SelectMenu
            value={pageSize}
            onChange={(value: number) => onChange(0, value)}
            options={PAGE_SIZE_OPTIONS}
            expandToFit
            rounded
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => onChange(pageIndex - 1, pageSize)}
            disabled={!canPrev}
            className={navClass(canPrev)}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => onChange(pageIndex + 1, pageSize)}
            disabled={!canNext}
            className={navClass(canNext)}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
