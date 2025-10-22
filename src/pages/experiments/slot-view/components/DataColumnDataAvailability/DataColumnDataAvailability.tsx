import type { JSX } from 'react';
import { useMemo } from 'react';
import clsx from 'clsx';
import { HeatmapChart } from '@/components/Charts/Heatmap';
import type { DataColumnDataAvailabilityProps } from './DataColumnDataAvailability.types';

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
export function DataColumnDataAvailability({
  blobCount,
  firstSeenData = [],
  currentTime,
  maxTime = 12000,
  className,
}: DataColumnDataAvailabilityProps): JSX.Element {
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
    <div className={clsx('rounded-sm border border-border bg-surface p-3', className)}>
      <HeatmapChart
        data={heatmapData}
        xLabels={xLabels}
        yLabels={yLabels}
        title="DATA COLUMN AVAILABILITY"
        xAxisTitle="Data Columns"
        yAxisTitle="Blobs"
        xAxisShowOnlyMinMax={true}
        yAxisShowOnlyMinMax={true}
        height={350}
        min={0}
        max={maxTime}
        visualMapType="piecewise"
        piecewisePieces={[
          { min: 0, max: 1000, color: '#22c55e', label: '0-1s' },
          { min: 1000, max: 2000, color: '#84cc16', label: '1-2s' },
          { min: 2000, max: 3000, color: '#eab308', label: '2-3s' },
          { min: 3000, max: 4000, color: '#f97316', label: '3-4s' },
          { min: 4000, color: '#ef4444', label: '>4s' },
        ]}
        showLabel={false}
        showVisualMap={true}
        animationDuration={0}
        formatValue={(value: number) => `${value.toFixed(0)}ms`}
        showCellBorders={true}
        tooltipFormatter={(params, xLabels, yLabels) => {
          const [x, y, value] = params.value;
          return `<strong>Data Column:</strong> ${xLabels[x]}<br/><strong>Blob:</strong> ${yLabels[y]}<br/><strong>First Seen:</strong> ${value.toFixed(0)}ms`;
        }}
        headerActions={
          <div className="flex flex-col items-end gap-1.5">
            <span className={clsx('font-mono text-sm font-medium', isDataAvailable ? 'text-success' : 'text-danger')}>
              {isDataAvailable ? '✓' : '✗'} Data available
            </span>
            <span className="font-mono text-sm text-muted">{onTimeColumnCount} columns published on time</span>
          </div>
        }
      />
    </div>
  );
}
