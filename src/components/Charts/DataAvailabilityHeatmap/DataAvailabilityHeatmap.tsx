import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Elements/Button';
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
  filters,
  selectedColumnIndex,
  onCellClick,
  onRowClick,
  onClearColumnSelection,
  onBack,
  cellSize = 'xs',
  showColumnHeader = true,
  showLegend = true,
  className,
}: DataAvailabilityHeatmapProps): React.JSX.Element => {
  // Track hover states for preview
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  /**
   * Apply filters to rows and cells
   */
  const filteredRows = useMemo(() => {
    return rows.map(row => {
      const filteredCells = row.cells.filter(cell => {
        // Filter by column group
        const columnGroup = Math.floor(cell.columnIndex / 32);
        if (!filters.columnGroups.has(columnGroup)) {
          return false;
        }

        // Filter by observation count
        const observationCount = cell.totalCount ?? 0;
        if (observationCount < filters.minObservationCount) {
          return false;
        }

        // Filter by availability (only if cell has data)
        const hasData = observationCount > 0;
        if (hasData) {
          const availabilityPercent = cell.availability * 100;
          if (availabilityPercent < filters.minAvailability || availabilityPercent > filters.maxAvailability) {
            return false;
          }
        }

        return true;
      });

      return {
        ...row,
        cells: filteredCells,
      };
    });
  }, [rows, filters]);

  // Get all unique column indices from the filtered data
  const columnIndices =
    filteredRows.length > 0
      ? Array.from(new Set(filteredRows.flatMap(row => row.cells.map(cell => cell.columnIndex)))).sort((a, b) => a - b)
      : [];

  // Get size-specific classes
  const cellSizeClass = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-10',
  }[cellSize];

  const labelWidth = {
    xs: 'min-w-12', // Minimum width, grows with content
    sm: 'min-w-16', // Minimum width, grows with content
    md: 'min-w-20', // Minimum width, grows with content
    lg: 'min-w-24', // Minimum width, grows with content
    xl: 'min-w-28', // Minimum width, grows with content
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
        <div className="flex items-center gap-3 rounded-sm border border-accent/20 bg-accent/5 px-3 py-2">
          <div className="flex grow items-center gap-2 text-xs/6">
            <span className="text-muted">Viewing column:</span>
            <span className="font-semibold text-accent">{selectedColumnIndex + 1}</span>
            <span className="text-muted">(other columns dimmed)</span>
          </div>
          {onClearColumnSelection && (
            <Button variant="secondary" size="sm" onClick={onClearColumnSelection}>
              Clear selection
            </Button>
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
            {filteredRows.map(row => (
              <div key={row.identifier} className="flex gap-2">
                {/* Row label */}
                <button
                  type="button"
                  onClick={() => onRowClick?.(row.identifier)}
                  onMouseEnter={() => setHoveredRow(row.identifier)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={clsx(
                    labelWidth,
                    textSize,
                    'shrink-0 truncate pr-2 text-left font-mono text-muted transition-colors',
                    onRowClick ? 'cursor-pointer hover:text-accent' : 'cursor-default',
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
                      granularity={granularity}
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
                {columnIndices.map(colIndex => {
                  const displayIndex = colIndex + 1;
                  const showLabel =
                    displayIndex % 10 === 0 ||
                    colIndex === columnIndices[columnIndices.length - 1] ||
                    hoveredColumn === colIndex;

                  return (
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
                      title={`Column ${displayIndex}`}
                    >
                      {showLabel ? displayIndex : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      {onBack && (
        <div>
          <Button variant="secondary" size="sm" onClick={onBack}>
            <div className="flex items-center gap-2">
              <ArrowLeftIcon className="size-4" />
              <span>Back</span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
};
