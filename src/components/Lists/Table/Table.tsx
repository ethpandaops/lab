import type { TableProps, Column } from './Table.types';
import type { ReactNode } from 'react';
import clsx from 'clsx';

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

  // Nested variant: Simple table without outer padding wrapper
  if (variant === 'nested') {
    return (
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      scope="col"
                      className={`py-3.5 text-left text-sm font-semibold whitespace-nowrap text-foreground ${
                        index === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                      } ${column.headerClassName || ''}`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
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
                          className={`py-4 text-sm whitespace-nowrap ${
                            colIndex === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                          } ${column.cellClassName || 'text-muted'}`}
                        >
                          {getCellValue(row, column)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Standalone variant: Full page-level component with padding
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
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        scope="col"
                        className={`py-3.5 text-left text-sm font-semibold whitespace-nowrap text-foreground ${
                          index === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                        } ${column.headerClassName || ''}`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
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
                            className={`py-4 text-sm whitespace-nowrap ${
                              colIndex === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                            } ${column.cellClassName || 'text-muted'}`}
                          >
                            {getCellValue(row, column)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
