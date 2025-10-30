import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Elements/Button';
import type { GridHeatmapProps, GridCellSize } from './GridHeatmap.types';

/**
 * Generic grid-based heatmap component with customizable cell rendering.
 *
 * Provides interactive grid functionality including:
 * - Row and column hover states
 * - Column selection/highlighting
 * - Configurable cell sizes
 * - Custom cell rendering via render prop
 * - Optional header content (filters, legend, etc.)
 * - Navigation (back button)
 *
 * @example
 * ```tsx
 * <GridHeatmap
 *   rows={rows}
 *   renderCell={(cellData, props) => (
 *     <CustomCell data={cellData} {...props} />
 *   )}
 *   onCellClick={(rowId, colIndex, cellData) => {
 *     console.log('Clicked:', rowId, colIndex, cellData);
 *   }}
 * />
 * ```
 */
export function GridHeatmap<T = unknown>({
  rows,
  cellSize = 'xs',
  showColumnHeader = true,
  selectedColumn,
  onCellClick,
  onRowClick,
  onClearColumnSelection,
  onBack,
  renderCell,
  renderHeader,
  renderColumnLabel,
  className,
}: GridHeatmapProps<T>): React.JSX.Element {
  // Track hover states for preview
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Get all unique column indices from the data
  const columnIndices = useMemo(
    () =>
      rows.length > 0
        ? Array.from(new Set(rows.flatMap(row => row.cells.map(cell => cell.columnIndex)))).sort((a, b) => a - b)
        : [],
    [rows]
  );

  // Get size-specific classes
  const cellSizeClass: Record<GridCellSize, string> = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-10',
  };

  const labelWidth: Record<GridCellSize, string> = {
    xs: 'min-w-12',
    sm: 'min-w-16',
    md: 'min-w-20',
    lg: 'min-w-24',
    xl: 'min-w-28',
  };

  const textSize: Record<GridCellSize, string> = {
    xs: 'text-xs/3',
    sm: 'text-xs/4',
    md: 'text-sm/6',
    lg: 'text-sm/8',
    xl: 'text-base/10',
  };

  // Default column label renderer
  const defaultRenderColumnLabel = (colIndex: number, isHovered: boolean, isSelected: boolean): React.JSX.Element => {
    const displayIndex = colIndex + 1;
    const showLabel = displayIndex % 10 === 0 || colIndex === columnIndices[columnIndices.length - 1] || isHovered;

    return (
      <button
        key={colIndex}
        type="button"
        onMouseEnter={() => setHoveredColumn(colIndex)}
        onMouseLeave={() => setHoveredColumn(null)}
        className={clsx(
          cellSizeClass[cellSize],
          textSize[cellSize],
          'text-center transition-colors',
          isSelected
            ? 'font-bold text-accent'
            : isHovered
              ? 'font-bold text-accent'
              : 'text-muted hover:text-foreground'
        )}
        title={`Column ${displayIndex}`}
      >
        {showLabel ? displayIndex : ''}
      </button>
    );
  };

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Selected column banner */}
      {selectedColumn !== undefined && (
        <div className="flex items-center gap-3 rounded-sm border border-accent/20 bg-accent/5 px-3 py-2">
          <div className="flex grow items-center gap-2 text-xs/6">
            <span className="text-muted">Viewing column:</span>
            <span className="font-semibold text-accent">{selectedColumn + 1}</span>
            <span className="text-muted">(other columns dimmed)</span>
          </div>
          {onClearColumnSelection && (
            <Button variant="secondary" size="sm" onClick={onClearColumnSelection}>
              Clear selection
            </Button>
          )}
        </div>
      )}

      {/* Header content (legend, filters, etc.) */}
      {renderHeader?.()}

      {/* Grid */}
      <div>
        <div>
          {/* Rows */}
          <div className="flex flex-col gap-px">
            {rows.map(row => (
              <div key={row.identifier} className="flex gap-2">
                {/* Row label */}
                <button
                  type="button"
                  onClick={() => onRowClick?.(row.identifier)}
                  onMouseEnter={() => setHoveredRow(row.identifier)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={clsx(
                    labelWidth[cellSize],
                    textSize[cellSize],
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
                  {row.cells.map(cell => {
                    const isSelected = selectedColumn === cell.columnIndex;
                    const isHighlighted = hoveredColumn === cell.columnIndex || hoveredRow === row.identifier;
                    const isDimmed = selectedColumn !== undefined && selectedColumn !== cell.columnIndex;

                    return (
                      <div key={`${row.identifier}-${cell.columnIndex}`}>
                        {renderCell(cell.data, {
                          isSelected,
                          isHighlighted,
                          isDimmed,
                          size: cellSize,
                          onClick: onCellClick
                            ? () => onCellClick(row.identifier, cell.columnIndex, cell.data)
                            : undefined,
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Column header at bottom */}
          {showColumnHeader && (
            <div className="mt-2 flex gap-px">
              {/* Spacer for row labels */}
              <div className={clsx(labelWidth[cellSize], 'shrink-0')} />

              {/* Column indices */}
              <div className="flex gap-px">
                {columnIndices.map(colIndex => {
                  const isHovered = hoveredColumn === colIndex;
                  const isSelected = selectedColumn === colIndex;

                  return (
                    <div key={colIndex}>
                      {renderColumnLabel
                        ? renderColumnLabel(colIndex, isHovered, isSelected)
                        : defaultRenderColumnLabel(colIndex, isHovered, isSelected)}
                    </div>
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
}
