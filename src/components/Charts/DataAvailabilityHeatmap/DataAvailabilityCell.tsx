import { useState } from 'react';
import clsx from 'clsx';
import type { DataAvailabilityCellProps, CellSize } from './DataAvailabilityHeatmap.types';

/**
 * Gets the color class based on availability percentage
 */
const getAvailabilityColor = (availability: number): string => {
  if (availability >= 0.95) return 'bg-success/90 hover:bg-success';
  if (availability >= 0.8) return 'bg-success/70 hover:bg-success/80';
  if (availability >= 0.6) return 'bg-warning/70 hover:bg-warning/80';
  if (availability >= 0.4) return 'bg-warning/50 hover:bg-warning/60';
  if (availability >= 0.2) return 'bg-danger/50 hover:bg-danger/60';
  return 'bg-danger/70 hover:bg-danger/80';
};

/**
 * Gets the size class for the cell
 */
const getSizeClass = (size: CellSize): string => {
  const sizes = {
    xs: 'size-3', // 12px (default)
    sm: 'size-4', // 16px
    md: 'size-6', // 24px
    lg: 'size-8', // 32px
    xl: 'size-10', // 40px
  };
  return sizes[size];
};

/**
 * Individual cell in the data availability heatmap
 */
export const DataAvailabilityCell = ({
  data,
  isSelected = false,
  isHighlighted = false,
  isDimmed = false,
  size = 'xs',
  onClick,
  showTooltip = true,
}: DataAvailabilityCellProps): React.JSX.Element => {
  const [showTooltipState, setShowTooltipState] = useState(false);

  const colorClass = getAvailabilityColor(data.availability);
  const availabilityPercent = (data.availability * 100).toFixed(1);

  const sizeClass = getSizeClass(size);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        className={clsx(
          sizeClass,
          'transition-all duration-150',
          colorClass,
          isSelected && 'ring-3 ring-accent ring-offset-2 ring-offset-background',
          isHighlighted && !isSelected && 'ring-2 ring-accent/80',
          isDimmed && 'opacity-10',
          onClick && 'cursor-pointer active:scale-95',
          !onClick && 'cursor-default'
        )}
        aria-label={`Column ${data.columnIndex}, ${availabilityPercent}% available`}
      />

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-sm bg-surface px-3 py-2 text-sm/6 whitespace-nowrap text-foreground shadow-sm">
          <div className="font-medium">Column {data.columnIndex}</div>
          <div className="text-muted">{availabilityPercent}% available</div>
          {data.successCount !== undefined && data.totalCount !== undefined && (
            <div className="text-xs text-muted">
              {data.successCount}/{data.totalCount} probes
            </div>
          )}
          {data.avgResponseTimeMs !== undefined && (
            <div className="text-xs text-muted">{data.avgResponseTimeMs}ms avg</div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
        </div>
      )}
    </div>
  );
};
