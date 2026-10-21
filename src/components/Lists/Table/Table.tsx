import type { TableProps, Column } from './Table.types';
import type { ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Data table.
 *
 * One density everywhere: 40px rows, muted `text-xs` column labels, foreground `text-sm` data
 * with tabular numerals. A nested table placed directly on a page gets a card surface; inside a
 * Card body it drops the surface, bleeds to the card edges and pads its edge columns by the
 * card's inset, so row rules span the card and cell text lines up with the card title.
 */
export function Table<T = unknown>({
  data,
  columns,
  title,
  description,
  variant = 'standalone',
  onRowClick,
  getRowClassName,
  getRowKey,
  getRowStyle,
}: TableProps<T>): ReactNode {
  const getCellValue = (row: T, column: Column<T>): ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return (row as Record<string, unknown>)[column.accessor as string] as ReactNode;
  };

  const edgePadding = (index: number): string =>
    clsx(index === 0 ? 'pl-(--table-inset)' : 'pl-3', index === columns.length - 1 ? 'pr-(--table-inset)' : 'pr-3');

  const table = (
    <table className="min-w-full divide-y divide-border">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th
              key={index}
              scope="col"
              className={clsx(
                'py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted',
                edgePadding(index),
                column.headerClassName
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.map((row, rowIndex) => {
          const rowKey = getRowKey ? getRowKey(row, rowIndex) : rowIndex;
          const rowClassName = getRowClassName ? getRowClassName(row, rowIndex) : '';
          const rowStyle = getRowStyle ? getRowStyle(row, rowIndex) : undefined;
          const isClickable = !!onRowClick;

          return (
            <tr
              key={rowKey}
              onClick={() => onRowClick?.(row, rowIndex)}
              className={clsx(
                'transition-colors',
                !rowClassName && (isClickable ? 'cursor-pointer hover:bg-background' : 'hover:bg-background'),
                rowClassName
              )}
              style={rowStyle}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className={clsx(
                    'py-2.5 text-sm whitespace-nowrap tabular-nums',
                    edgePadding(colIndex),
                    column.cellClassName || 'text-foreground'
                  )}
                >
                  {getCellValue(row, column)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // Nested variant: no outer chrome, for use inside Cards or other containers
  if (variant === 'nested') {
    return (
      <div
        className={clsx(
          'overflow-x-auto [--table-inset:--spacing(4)] sm:[--table-inset:--spacing(6)]',
          // On a page: its own surface, matching Card depth
          'rounded-sm bg-surface outline -outline-offset-1 outline-border',
          // Inside a Card body: transparent, flush to the card edges, aligned to the card inset
          'in-data-[slot=card-body]:-mx-(--card-inset) in-data-[slot=card-body]:rounded-none in-data-[slot=card-body]:bg-transparent in-data-[slot=card-body]:outline-none in-data-[slot=card-body]:[--table-inset:var(--card-inset)]',
          'in-data-[slot=card-body]:first:-mt-(--card-inset-y) in-data-[slot=card-body]:last:-mb-(--card-inset-y)'
        )}
      >
        {table}
      </div>
    );
  }

  // Standalone variant: page-level table with its own bordered container
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {(title || description) && (
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            {title && <h1 className="text-base/7 font-semibold text-foreground">{title}</h1>}
            {description && <p className="mt-2 text-sm/6 text-muted">{description}</p>}
          </div>
        </div>
      )}
      <div className={title || description ? 'mt-8 flow-root' : 'flow-root'}>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-sm border border-border [--table-inset:--spacing(4)] sm:[--table-inset:--spacing(6)]">
              {table}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
