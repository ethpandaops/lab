import type { JSX } from 'react';
import { useMemo, memo } from 'react';
import clsx from 'clsx';
import { HeatmapChart } from '@/components/Charts/Heatmap';
import type { DataColumnDataAvailabilityProps } from './DataColumnDataAvailability.types';
import { getDataVizColors } from '@/utils/dataVizColors';

/**
 * DataColumnDataAvailability - Page-specific component for visualizing data column availability
 *
 * Displays a heatmap showing when each data column was first seen:
 * - X-axis: 128 data columns (0-127)
 * - Y-axis: Blobs (shows range "0 → n" when >6 blobs, individual labels otherwise)
 * - Cell color: Time when column was first seen with 4000ms deadline
 *   - 0-1000ms: Green (very early)
 *   - 1000-2000ms: Lime (early)
 *   - 2000-3000ms: Yellow (on time)
 *   - 3000-4000ms: Orange (cutting it close)
 *   - >4000ms: Red (missed deadline)
 * - Each row shows the same column data (columns are independent of blobs)
 * - Fixed height of 400px regardless of blob count
 *
 * Title includes two status indicators on the right:
 * 1. Data availability: "✓ Data is available" (green) or "✗ Data is available" (red)
 *    - Shows green checkmark if >= 64 columns received, red cross otherwise
 * 2. On-time count: "n columns published on time" - counts columns arriving < 4000ms
 *
 * Both indicators respect currentTime and only count visible columns.
 *
 * Only renders data up to the current slot time, simulating live progression.
 *
 * @example
 * ```tsx
 * <DataColumnDataAvailability
 *   blobCount={6}
 *   currentTime={4500}
 *   firstSeenData={[
 *     { columnId: 0, time: 1200 },
 *     { columnId: 1, time: 1300 },
 *   ]}
 * />
 * ```
 */
function DataColumnDataAvailabilityComponent({
  blobCount,
  firstSeenData = [],
  currentTime,
  maxTime = 12000,
  className,
}: DataColumnDataAvailabilityProps): JSX.Element {
  const { PERFORMANCE_TIME_COLORS } = getDataVizColors();
  // Default currentTime to maxTime to show all data if not specified
  const effectiveCurrentTime = currentTime ?? maxTime;

  // Calculate on-time columns (< 4000ms deadline)
  const onTimeColumnCount = useMemo(() => {
    const visibleData = firstSeenData.filter(point => point.time <= effectiveCurrentTime);
    return visibleData.filter(point => point.time < 4000).length;
  }, [firstSeenData, effectiveCurrentTime]);

  // Calculate data availability (need >= 64 columns arriving before 4000ms deadline)
  const isDataAvailable = useMemo(() => {
    const visibleData = firstSeenData.filter(point => point.time <= effectiveCurrentTime);
    const validColumns = visibleData.filter(point => point.time < 4000);
    return validColumns.length >= 64;
  }, [firstSeenData, effectiveCurrentTime]);

  // Prepare heatmap data for HeatmapChart component
  const { heatmapData, xLabels, yLabels } = useMemo(() => {
    // Filter data to only show events that have happened
    const visibleData = firstSeenData.filter(point => point.time <= effectiveCurrentTime);

    // Transform data to heatmap format: [[x, y, value], ...]
    // Each blob row shows the same column data (columns are independent of blobs)
    const data: [number, number, number][] = [];
    for (let blobId = 0; blobId < blobCount; blobId++) {
      visibleData.forEach(point => {
        data.push([point.columnId, blobId, point.time]);
      });
    }

    // Generate column labels (0-127)
    const columns = Array.from({ length: 128 }, (_, i) => i.toString());

    // Generate blob labels based on blobCount
    const blobs = Array.from({ length: blobCount }, (_, i) => i.toString());

    return {
      heatmapData: data,
      xLabels: columns,
      yLabels: blobs,
    };
  }, [firstSeenData, blobCount, effectiveCurrentTime]);

  return (
    <div className={clsx('flex h-full flex-col bg-surface', className)}>
      <div className="flex shrink-0 items-center justify-between px-3 py-1">
        <h3 className="text-xs font-semibold text-foreground uppercase">Data Column Availability</h3>
        <div className="flex items-center gap-3">
          <span className={clsx('text-xs font-medium', isDataAvailable ? 'text-success' : 'text-danger')}>
            {isDataAvailable ? '✓' : '✗'} Data available
          </span>
          <span className="text-xs text-muted">{onTimeColumnCount} on time</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <HeatmapChart
          data={heatmapData}
          xLabels={xLabels}
          yLabels={yLabels}
          yAxisTitle="Blobs"
          height="100%"
          min={0}
          max={maxTime}
          visualMapType="piecewise"
          piecewisePieces={[
            { min: 0, max: 1000, color: PERFORMANCE_TIME_COLORS.excellent, label: '0-1s' },
            { min: 1000, max: 2000, color: PERFORMANCE_TIME_COLORS.good, label: '1-2s' },
            { min: 2000, max: 3000, color: PERFORMANCE_TIME_COLORS.fair, label: '2-3s' },
            { min: 3000, max: 4000, color: PERFORMANCE_TIME_COLORS.slow, label: '3-4s' },
            { min: 4000, color: PERFORMANCE_TIME_COLORS.poor, label: '>4s' },
          ]}
          showVisualMap={true}
          animationDuration={0}
          emphasisDisabled={false}
          tooltipFormatter={(params, xLabels, yLabels) => {
            const [x, y, value] = params.value;
            return `<strong>Data Column:</strong> ${xLabels[x]}<br/><strong>Blob:</strong> ${yLabels[y]}<br/><strong>First Seen:</strong> ${value.toFixed(0)}ms`;
          }}
          grid={{
            top: 5,
            right: 85,
            bottom: 30,
            left: 32,
          }}
        />
      </div>
    </div>
  );
}

export const DataColumnDataAvailability = memo(DataColumnDataAvailabilityComponent);
