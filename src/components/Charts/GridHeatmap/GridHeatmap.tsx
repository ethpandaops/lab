import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ArrowLeftIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Elements/Button';
import type { GridHeatmapProps, GridCellSize, RowLabelRenderProps } from './GridHeatmap.types';

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
  onCellClick,
  onColumnClick,
  onBack,
  renderCell,
  renderHeader,
  renderRowLabel,
  renderColumnLabel,
  xAxisTitle,
  yAxisTitle,
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

  // Cell sizing - 3xs uses flexible sizing to fill container, others use fixed sizes
  const cellSizeClass: Record<GridCellSize, string> = {
    '3xs': 'aspect-square', // Responsive - height matches width, actual width set by grid
    '2xs': 'size-[9px]', // 9px - compact
    xs: 'size-2.5', // 10px
    sm: 'size-3', // 12px
    md: 'size-4', // 16px
    lg: 'size-6', // 24px
    xl: 'size-8', // 32px
  };

  // Label width - fixed sizes, container scrolls on mobile
  const labelWidth: Record<GridCellSize, string> = {
    '3xs': 'w-36', // 144px - enough for icon + badge + value + chevron
    '2xs': 'w-36',
    xs: 'w-36',
    sm: 'w-40',
    md: 'w-44',
    lg: 'w-48',
    xl: 'w-52',
  };

  const textSize: Record<GridCellSize, string> = {
    '3xs': 'text-[10px]/3', // 10px - compact
    '2xs': 'text-xs/4', // 12px - readable
    xs: 'text-xs/4',
    sm: 'text-sm/5',
    md: 'text-sm/6',
    lg: 'text-base/7',
    xl: 'text-base/8',
  };

  // Gap between cells for visual separation
  const cellGap: Record<GridCellSize, string> = {
    '3xs': 'gap-px', // 1px gap for heatmap look
    '2xs': 'gap-px', // 1px
    xs: 'gap-px',
    sm: 'gap-px',
    md: 'gap-0.5',
    lg: 'gap-0.5',
    xl: 'gap-1',
  };

  // Container style for cells - 3xs uses CSS grid to fill available space
  const cellContainerClass: Record<GridCellSize, string> = {
    '3xs': 'grid flex-1', // CSS grid, fills remaining space
    '2xs': 'flex',
    xs: 'flex',
    sm: 'flex',
    md: 'flex',
    lg: 'flex',
    xl: 'flex',
  };

  // For 3xs, calculate grid columns based on actual column count
  // Use minmax to ensure cells have a minimum size for usability (6px min)
  const gridStyle =
    cellSize === '3xs' ? { gridTemplateColumns: `repeat(${columnIndices.length}, minmax(6px, 1fr))` } : undefined;

  // Default column label renderer - shows 0-127 (raw column indices)
  // Only 0 and 127 are persistent; others appear on hover
  // Persistent labels fade out when a nearby column (within 2) is hovered
  // For 3xs size, we use absolute positioning so text doesn't affect grid column width
  const defaultRenderColumnLabel = (colIndex: number, isHovered: boolean): React.JSX.Element => {
    // Persistent labels: 0, 16, 32, 48, 64, 80, 96, 112, 127 (every 16 + endpoint)
    const isPersistent = colIndex === 0 || colIndex === 127 || colIndex % 16 === 0;
    const isClickable = !!onColumnClick;
    const is3xs = cellSize === '3xs';

    // Check if a different column near this one is being hovered
    const isNearbyColumnHovered =
      hoveredColumn !== null && hoveredColumn !== colIndex && Math.abs(hoveredColumn - colIndex) <= 2;

    // Visibility logic:
    // - Persistent columns (0, 127): visible unless a nearby column is hovered (and this one isn't)
    // - Non-persistent: only visible when hovered
    const shouldShow = isPersistent ? isHovered || !isNearbyColumnHovered : isHovered;

    return (
      <div
        key={colIndex}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? () => onColumnClick(colIndex) : undefined}
        onKeyDown={
          isClickable
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') onColumnClick(colIndex);
              }
            : undefined
        }
        onMouseEnter={() => setHoveredColumn(colIndex)}
        onMouseLeave={() => setHoveredColumn(null)}
        className={clsx(
          // For 3xs, use relative positioning container; otherwise use cell size
          is3xs ? 'relative h-3' : cellSizeClass[cellSize],
          isClickable && 'cursor-pointer'
        )}
        title={isClickable ? `View probes for column ${colIndex}` : `Column ${colIndex}`}
      >
        {/* Label text - absolutely positioned for 3xs to not affect grid width */}
        <span
          className={clsx(
            textSize[cellSize],
            'whitespace-nowrap transition-all',
            // For 3xs, absolutely position centered below the column
            is3xs && 'absolute top-0 left-1/2 -translate-x-1/2',
            // Visibility
            shouldShow ? 'opacity-100' : 'opacity-0 hover:opacity-100',
            isHovered ? 'font-bold text-accent' : 'text-muted',
            isClickable && 'hover:text-accent'
          )}
        >
          {colIndex}
        </span>
      </div>
    );
  };

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {/* Header content (legend, filters, etc.) */}
      {renderHeader?.()}

      {/* Grid with optional Y-axis title - scrollable on mobile */}
      <div className="flex overflow-x-auto">
        {/* Y-axis title - vertical text on the left */}
        {yAxisTitle && (
          <div className="flex shrink-0 items-center justify-center pr-1">
            <span
              className="text-[10px] font-medium tracking-wider text-muted uppercase"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {yAxisTitle}
            </span>
          </div>
        )}

        {/* Main grid area - min-width ensures cells don't collapse too much */}
        <div className="min-w-fit flex-1">
          {/* Rows */}
          <div className="flex flex-col gap-0.5">
            {rows.map(row => {
              const rowLabelProps: RowLabelRenderProps = {
                identifier: row.identifier,
                label: row.label,
                isHovered: hoveredRow === row.identifier,
                canDrillDown: !!onRowClick,
                onDrillDown: onRowClick ? () => onRowClick(row.identifier) : undefined,
                onMouseEnter: () => setHoveredRow(row.identifier),
                onMouseLeave: () => setHoveredRow(null),
              };

              return (
                <div key={row.identifier} className="flex items-center">
                  {/* Row label - custom or default */}
                  {renderRowLabel ? (
                    <div className={clsx(labelWidth[cellSize], 'shrink-0')}>{renderRowLabel(rowLabelProps)}</div>
                  ) : (
                    <button
                      type="button"
                      onClick={rowLabelProps.onDrillDown}
                      onMouseEnter={rowLabelProps.onMouseEnter}
                      onMouseLeave={rowLabelProps.onMouseLeave}
                      className={clsx(
                        labelWidth[cellSize],
                        textSize[cellSize],
                        'group flex shrink-0 items-center justify-end gap-1.5 truncate pr-2 text-right transition-colors',
                        onRowClick ? 'cursor-pointer hover:text-accent' : 'cursor-default text-muted',
                        hoveredRow === row.identifier ? 'font-bold text-accent' : 'text-muted'
                      )}
                      title={onRowClick ? 'Click to drill down' : row.label}
                    >
                      {/* Drill-down icon (only visible on hover if clickable) */}
                      {onRowClick && (
                        <MagnifyingGlassPlusIcon
                          className={clsx(
                            'size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100',
                            hoveredRow === row.identifier && 'opacity-100'
                          )}
                        />
                      )}
                      <span className="truncate">{row.label}</span>
                    </button>
                  )}

                  {/* Cells with size-appropriate gap for visual separation */}
                  <div className={clsx(cellContainerClass[cellSize], cellGap[cellSize])} style={gridStyle}>
                    {row.cells.map(cell => {
                      const isHighlighted = hoveredColumn === cell.columnIndex || hoveredRow === row.identifier;

                      return (
                        <div key={`${row.identifier}-${cell.columnIndex}`}>
                          {renderCell(cell.data, {
                            isSelected: false,
                            isHighlighted,
                            isDimmed: false,
                            size: cellSize,
                            onClick: onCellClick ? () => onCellClick(row.identifier, cell.columnIndex) : undefined,
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column header at bottom */}
          {showColumnHeader && (
            <div className="mt-1 flex items-center">
              {/* Spacer for row labels */}
              <div className={clsx(labelWidth[cellSize], 'shrink-0')} />

              {/* Column indices - matching cell gap */}
              <div className={clsx(cellContainerClass[cellSize], cellGap[cellSize])} style={gridStyle}>
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

          {/* X-axis title - below column indices */}
          {xAxisTitle && (
            <div className="mt-2 flex items-center">
              {/* Spacer for row labels + y-axis title */}
              <div className={clsx(labelWidth[cellSize], 'shrink-0')} />
              {/* Title centered over columns */}
              <div className="flex-1 text-center text-[10px] font-medium tracking-wider text-muted uppercase">
                {xAxisTitle}
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
