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
 * />
 * ```
 */
export function GridHeatmap<T = unknown>({
  rows,
  cellSize = '2xs',
  showColumnHeader = true,
  onRowClick,
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

  // Get size-specific classes - using fixed widths for alignment
  const cellSizeClass: Record<GridCellSize, string> = {
    '2xs': 'size-[9px]', // 9px - compact
    xs: 'size-2.5', // 10px
    sm: 'size-3', // 12px
    md: 'size-4', // 16px
    lg: 'size-6', // 24px
    xl: 'size-8', // 32px
  };

  const labelWidth: Record<GridCellSize, string> = {
    '2xs': 'w-24', // 96px - room for "Epoch 12345" labels
    xs: 'w-24', // 96px
    sm: 'w-28',
    md: 'w-32',
    lg: 'w-36',
    xl: 'w-40',
  };

  const textSize: Record<GridCellSize, string> = {
    '2xs': 'text-xs/4', // 12px - readable
    xs: 'text-xs/4',
    sm: 'text-sm/5',
    md: 'text-sm/6',
    lg: 'text-base/7',
    xl: 'text-base/8',
  };

  // Default column label renderer
  const defaultRenderColumnLabel = (colIndex: number, isHovered: boolean): React.JSX.Element => {
    const displayIndex = colIndex + 1;
    const showLabel = displayIndex % 16 === 0 || colIndex === 0 || isHovered;

    return (
      <div
        key={colIndex}
        onMouseEnter={() => setHoveredColumn(colIndex)}
        onMouseLeave={() => setHoveredColumn(null)}
        className={clsx(
          cellSizeClass[cellSize],
          textSize[cellSize],
          'text-center transition-colors',
          isHovered ? 'font-bold text-accent' : 'text-muted'
        )}
        title={`Column ${displayIndex}`}
      >
        {showLabel ? displayIndex : ''}
      </div>
    );
  };

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {/* Header content (legend, filters, etc.) */}
      {renderHeader?.()}

      {/* Grid */}
      <div>
        {/* Rows */}
        <div className="flex flex-col gap-0.5">
          {rows.map(row => (
            <div key={row.identifier} className="flex items-center">
              {/* Row label - fixed width for alignment */}
              <button
                type="button"
                onClick={() => onRowClick?.(row.identifier)}
                onMouseEnter={() => setHoveredRow(row.identifier)}
                onMouseLeave={() => setHoveredRow(null)}
                className={clsx(
                  labelWidth[cellSize],
                  textSize[cellSize],
                  'shrink-0 truncate pr-2 text-right text-muted transition-colors',
                  onRowClick ? 'cursor-pointer hover:text-accent' : 'cursor-default',
                  hoveredRow === row.identifier && 'font-bold text-accent'
                )}
                title={row.label}
              >
                {row.label}
              </button>

              {/* Cells with small gap for visual separation */}
              <div className="flex gap-px">
                {row.cells.map(cell => {
                  const isHighlighted = hoveredColumn === cell.columnIndex || hoveredRow === row.identifier;

                  return (
                    <div key={`${row.identifier}-${cell.columnIndex}`}>
                      {renderCell(cell.data, {
                        isSelected: false,
                        isHighlighted,
                        isDimmed: false,
                        size: cellSize,
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
          <div className="mt-1 flex items-center">
            {/* Spacer for row labels */}
            <div className={clsx(labelWidth[cellSize], 'shrink-0')} />

            {/* Column indices - matching cell gap */}
            <div className="flex gap-px">
              {columnIndices.map(colIndex => {
                const isHovered = hoveredColumn === colIndex;

                return (
                  <div key={colIndex}>
                    {renderColumnLabel
                      ? renderColumnLabel(colIndex, isHovered, false)
                      : defaultRenderColumnLabel(colIndex, isHovered)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
