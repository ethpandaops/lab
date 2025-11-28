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
 * - Cell color: Continuous gradient based on time when column was first seen
 *   - Green (0ms) → Yellow (2000ms) → Red (4000ms)
 *   - 1px spacing between columns for better visibility
 *   - 4000ms deadline for "on time" determination
 * - Each row shows the same column data (columns are independent of blobs)
 * - Fixed height of 400px regardless of blob count
 *
 * Title includes two status indicators on the right:
 * 1. Data availability: "✓ Data is available" (green) or "✗ Data is available" (red)
 *    - Shows green checkmark if >= 64 columns received, red cross otherwise
 * 2. On-time count: "n columns published on time" - counts columns arriving < 4000ms
 *
 * Both indicators respect the provided dataset and only count the visible columns.
 *
 * Only renders the data that has been provided, so pass in records filtered to the
 * desired slot time to simulate live progression.
 *
 * @example
 * ```tsx
 * <DataColumnDataAvailability
 *   blobCount={6}
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
  maxTime = 4000,
  className,
}: DataColumnDataAvailabilityProps): JSX.Element {
  const { PERFORMANCE_TIME_COLORS } = getDataVizColors();

  // Calculate on-time columns (< 4000ms deadline)
  const onTimeColumnCount = useMemo(() => {
    return firstSeenData.filter(point => point.time < 4000).length;
  }, [firstSeenData]);

  // Calculate data availability (need >= 64 columns arriving before 4000ms deadline)
  const isDataAvailable = useMemo(() => {
    return onTimeColumnCount >= 64;
  }, [onTimeColumnCount]);

  // Prepare heatmap data for HeatmapChart component
  const { heatmapData, xLabels, yLabels } = useMemo(() => {
    // Filter data to only show events that have happened
    // Transform data to heatmap format: [[x, y, value], ...]
    // Each blob row shows the same column data (columns are independent of blobs)
    const data: [number, number, number][] = [];
    for (let blobId = 0; blobId < blobCount; blobId++) {
      firstSeenData.forEach(point => {
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
  }, [firstSeenData, blobCount]);

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
          visualMapType="continuous"
          colorGradient={[
            PERFORMANCE_TIME_COLORS.excellent,
            PERFORMANCE_TIME_COLORS.good,
            PERFORMANCE_TIME_COLORS.fair,
            PERFORMANCE_TIME_COLORS.slow,
            PERFORMANCE_TIME_COLORS.poor,
          ]}
          showVisualMap={true}
          showCellBorders={true}
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
