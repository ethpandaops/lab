import { useState } from 'react';
import clsx from 'clsx';
import { DataAvailabilityCell } from './DataAvailabilityCell';
import { DataAvailabilityLegend } from './DataAvailabilityLegend';
import type { DataAvailabilityHeatmapProps } from './DataAvailabilityHeatmap.types';

/**
 * Heatmap visualization for data availability across columns and time periods.
 * Supports hierarchical drill-down from days → epochs → slots.
 */
export const DataAvailabilityHeatmap = ({
  rows,
  granularity,
  selectedColumnIndex,
  onCellClick,
  onRowClick,
  onClearColumnSelection,
  cellSize = 'xs',
  showColumnHeader = true,
  showLegend = true,
  className,
}: DataAvailabilityHeatmapProps): React.JSX.Element => {
  // Get all unique column indices from the data
  const columnIndices = rows.length > 0 ? rows[0].cells.map(cell => cell.columnIndex) : [];

  // Track hover states for preview
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Get size-specific classes
  const cellSizeClass = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-10',
  }[cellSize];

  const labelWidth = {
    xs: 'w-16', // 64px
    sm: 'w-20', // 80px
    md: 'w-24', // 96px
    lg: 'w-28', // 112px
    xl: 'w-32', // 128px
  }[cellSize];

  const textSize = {
    xs: 'text-xs/3',
    sm: 'text-xs/4',
    md: 'text-sm/6',
    lg: 'text-sm/8',
    xl: 'text-base/10',
  }[cellSize];

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Selected column banner */}
      {selectedColumnIndex !== undefined && (
        <div className="flex items-center gap-3 rounded-sm bg-accent/10 px-4 py-3">
          <div className="flex grow items-center gap-2 text-sm/6">
            <span className="text-muted">Viewing column:</span>
            <span className="font-semibold text-accent">{selectedColumnIndex}</span>
            <span className="text-xs text-muted">(other columns dimmed)</span>
          </div>
          {onClearColumnSelection && (
            <button
              type="button"
              onClick={onClearColumnSelection}
              className="rounded-xs bg-background px-3 py-1.5 text-sm/6 text-foreground transition-colors hover:bg-muted"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && <DataAvailabilityLegend granularity={granularity} />}

      {/* Heatmap */}
      <div>
        <div>
          {/* Rows */}
          <div className="flex flex-col gap-px">
            {rows.map(row => (
              <div key={row.identifier} className="flex gap-px">
                {/* Row label */}
                <button
                  type="button"
                  onClick={() => onRowClick?.(row.identifier)}
                  onMouseEnter={() => setHoveredRow(row.identifier)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={clsx(
                    labelWidth,
                    textSize,
                    'shrink-0 truncate text-left transition-colors',
                    onRowClick ? 'cursor-pointer text-foreground hover:text-accent' : 'cursor-default text-muted',
                    hoveredRow === row.identifier && 'font-bold text-accent'
                  )}
                  title={row.label}
                >
                  {row.label}
                </button>

                {/* Cells */}
                <div className="flex gap-px">
                  {row.cells.map(cell => (
                    <DataAvailabilityCell
                      key={`${row.identifier}-${cell.columnIndex}`}
                      data={cell}
                      size={cellSize}
                      isSelected={selectedColumnIndex === cell.columnIndex}
                      isHighlighted={hoveredColumn === cell.columnIndex || hoveredRow === row.identifier}
                      isDimmed={selectedColumnIndex !== undefined && selectedColumnIndex !== cell.columnIndex}
                      onClick={onCellClick ? () => onCellClick(row.identifier, cell.columnIndex) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Column header at bottom */}
          {showColumnHeader && (
            <div className="mt-2 flex gap-px">
              {/* Spacer for row labels */}
              <div className={clsx(labelWidth, 'shrink-0')} />

              {/* Column indices */}
              <div className="flex gap-px">
                {columnIndices.map(colIndex => (
                  <button
                    key={colIndex}
                    type="button"
                    onMouseEnter={() => setHoveredColumn(colIndex)}
                    onMouseLeave={() => setHoveredColumn(null)}
                    className={clsx(
                      cellSizeClass,
                      textSize,
                      'text-center transition-colors',
                      selectedColumnIndex === colIndex
                        ? 'font-bold text-accent'
                        : hoveredColumn === colIndex
                          ? 'font-bold text-accent'
                          : 'text-muted hover:text-foreground'
                    )}
                    title={`Column ${colIndex}`}
                  >
                    {colIndex % 10 === 0 ||
                    colIndex === columnIndices[columnIndices.length - 1] ||
                    hoveredColumn === colIndex
                      ? colIndex
                      : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6 text-sm/6">
        <div>
          <span className="text-muted">Total {granularity}s:</span>{' '}
          <span className="font-medium text-foreground">{rows.length}</span>
        </div>
        <div>
          <span className="text-muted">Columns:</span>{' '}
          <span className="font-medium text-foreground">{columnIndices.length}</span>
        </div>
        {selectedColumnIndex !== undefined && (
          <div>
            <span className="text-muted">Selected column:</span>{' '}
            <span className="font-medium text-accent">{selectedColumnIndex}</span>
          </div>
        )}
      </div>
    </div>
  );
};
