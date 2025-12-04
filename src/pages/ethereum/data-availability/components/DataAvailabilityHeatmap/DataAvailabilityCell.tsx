import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { DataAvailabilityCellProps, CellSize } from './DataAvailabilityHeatmap.types';

/**
 * Gets the color class based on availability percentage (percentage mode)
 */
const getPercentageColor = (availability: number, hasData: boolean): string => {
  // No data - show empty cell with inset shadow (doesn't affect sizing)
  if (!hasData)
    return 'bg-background shadow-[inset_0_0_0_1px_rgba(128,128,128,0.2)] hover:shadow-[inset_0_0_0_1px_rgba(128,128,128,0.3)]';

  // Has data - color based on availability percentage
  if (availability >= 0.95) return 'bg-success/90 hover:bg-success';
  if (availability >= 0.8) return 'bg-success/70 hover:bg-success/80';
  if (availability >= 0.6) return 'bg-warning/70 hover:bg-warning/80';
  if (availability >= 0.4) return 'bg-warning/50 hover:bg-warning/60';
  if (availability >= 0.2) return 'bg-danger/50 hover:bg-danger/60';
  // 0-20% availability (including 0%) = red
  return 'bg-danger/70 hover:bg-danger/80';
};

/**
 * Gets the color class based on success count vs threshold (threshold mode)
 * Uses softer colors for "bad" states since low counts might just be low traffic
 */
const getThresholdColor = (successCount: number, threshold: number, hasData: boolean): string => {
  // No data - show empty cell
  if (!hasData)
    return 'bg-background shadow-[inset_0_0_0_1px_rgba(128,128,128,0.2)] hover:shadow-[inset_0_0_0_1px_rgba(128,128,128,0.3)]';

  const ratio = successCount / threshold;

  // >= 3x threshold: Very healthy - full green
  if (ratio >= 3) return 'bg-success/90 hover:bg-success';
  // >= 2x threshold: Healthy - light green
  if (ratio >= 2) return 'bg-success/70 hover:bg-success/80';
  // >= 1x threshold: Meets threshold - yellow-green
  if (ratio >= 1) return 'bg-success/50 hover:bg-success/60';
  // >= 0.5x threshold: Borderline - yellow
  if (ratio >= 0.5) return 'bg-warning/50 hover:bg-warning/60';
  // >= 0.25x threshold: Concerning - light orange (softer than danger)
  if (ratio >= 0.25) return 'bg-warning/30 hover:bg-warning/40';
  // < 0.25x threshold: Low observations - muted orange (not harsh red)
  return 'bg-warning/20 hover:bg-warning/30';
};

/**
 * Gets the size class for the cell
 */
const getSizeClass = (size: CellSize): string => {
  const sizes: Record<CellSize, string> = {
    '3xs': 'aspect-square w-full', // Responsive - fills grid cell
    '2xs': 'size-[9px]', // 9px - compact
    xs: 'size-2.5', // 10px
    sm: 'size-3', // 12px
    md: 'size-4', // 16px
    lg: 'size-6', // 24px
    xl: 'size-8', // 32px
  };
  return sizes[size];
};

/**
 * Gets the disabled cell color (for rows with no data, e.g., slots with no blobs)
 */
const getDisabledColor = (): string => {
  return 'bg-muted/10';
};

/**
 * Individual cell in the data availability heatmap
 */
export const DataAvailabilityCell = ({
  data,
  granularity,
  viewMode = 'percentage',
  threshold = 30,
  isSelected = false,
  isHighlighted = false,
  isDimmed = false,
  size = '2xs',
  onClick,
  showTooltip = true,
}: DataAvailabilityCellProps): React.JSX.Element => {
  const [showTooltipState, setShowTooltipState] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if the row is disabled (e.g., slot with no blobs)
  const isRowDisabled = data.rowDisabled === true;

  // Check if this cell has actual data (not a placeholder)
  const hasData = (data.totalCount ?? 0) > 0;
  const successCount = data.successCount ?? 0;

  // Get color based on view mode - disabled rows always get disabled color
  const colorClass = isRowDisabled
    ? getDisabledColor()
    : viewMode === 'threshold'
      ? getThresholdColor(successCount, threshold, hasData)
      : getPercentageColor(data.availability, hasData);

  const availabilityPercent = (data.availability * 100).toFixed(1);
  // Use raw column index (0-127) to match column labels
  const displayColumnIndex = data.columnIndex;

  // Determine response time label based on granularity
  // Slot/Blob levels use p50 (median), aggregated levels use avg p50
  const responseTimeLabel = granularity === 'epoch' || granularity === 'slot' ? 'p50' : 'avg p50';

  // Calculate threshold ratio for tooltip in threshold mode
  const thresholdRatio = threshold > 0 ? successCount / threshold : 0;

  const sizeClass = getSizeClass(size);

  // Update tooltip position when showing
  useEffect(() => {
    if (showTooltipState && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8, // 8px margin above the cell
        left: rect.left + rect.width / 2,
      });
    }
  }, [showTooltipState]);

  const tooltipContent = (
    <div
      className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-xs bg-surface px-3 py-2 text-sm/6 whitespace-nowrap text-foreground shadow-lg"
      style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
    >
      <div className="font-medium">Column {displayColumnIndex}</div>
      {isRowDisabled ? (
        <div className="text-xs/4 text-muted">No blobs in this slot</div>
      ) : hasData ? (
        viewMode === 'threshold' ? (
          // Threshold mode tooltip
          <>
            <div className="text-muted">
              {successCount} observations ({thresholdRatio >= 1 ? 'meets' : 'below'} threshold)
            </div>
            <div className="text-xs/4 text-muted">
              {(thresholdRatio * 100).toFixed(0)}% of threshold ({threshold})
            </div>
            {data.avgResponseTimeMs !== undefined && data.avgResponseTimeMs > 0 && (
              <div className="text-xs/4 text-muted">
                {Math.round(data.avgResponseTimeMs)}ms {responseTimeLabel}
              </div>
            )}
          </>
        ) : (
          // Percentage mode tooltip
          <>
            <div className="text-muted">{availabilityPercent}% successful probes</div>
            {data.successCount !== undefined && data.totalCount !== undefined && (
              <div className="text-xs/4 text-muted">
                {data.successCount}/{data.totalCount} observations
              </div>
            )}
            {data.avgResponseTimeMs !== undefined && data.avgResponseTimeMs > 0 && (
              <div className="text-xs/4 text-muted">
                {Math.round(data.avgResponseTimeMs)}ms {responseTimeLabel}
              </div>
            )}
          </>
        )
      ) : (
        <div className="text-xs/4 text-muted">No data</div>
      )}
      {/* Tooltip arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
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
        aria-label={`Column ${displayColumnIndex}, ${availabilityPercent}% successful probes`}
      />

      {/* Tooltip rendered via portal to body */}
      {showTooltip && showTooltipState && createPortal(tooltipContent, document.body)}
    </>
  );
};
