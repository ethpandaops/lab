import type { JSX } from 'react';
import { useContext, useMemo, memo } from 'react';
import clsx from 'clsx';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/16/solid';
import { SlotPlayerProgressContext } from '@/contexts/SlotPlayerContext';
import { HeatmapChart } from '@/components/Charts/Heatmap';
import type { DataColumnDataAvailabilityProps } from './DataColumnDataAvailability.types';
import { getDataVizColors } from '@/utils/dataVizColors';

/**
 * Availability verdict for the header. Reads replay progress (when inside a slot player) so a
 * slot is not called unavailable before its columns had time to arrive.
 */
function AvailabilityStatus({
  blobCount,
  onTimeColumnCount,
  deadlineMs,
}: {
  /** Blobs in the block; null while unknown */
  blobCount: number | null;
  onTimeColumnCount: number;
  deadlineMs: number;
}): JSX.Element {
  const progress = useContext(SlotPlayerProgressContext);
  const pastDeadline = progress === undefined || progress.slotProgress >= deadlineMs;

  const status =
    onTimeColumnCount >= 64
      ? { label: 'Data available', icon: CheckCircleIcon, tone: 'text-success' }
      : blobCount === 0
        ? { label: 'No blobs', icon: null, tone: 'text-muted' }
        : !pastDeadline || blobCount === null
          ? { label: 'Waiting for columns', icon: ClockIcon, tone: 'text-muted' }
          : { label: 'Data not available', icon: XCircleIcon, tone: 'text-danger' };
  const Icon = status.icon;

  return (
    <span className={clsx('flex items-center gap-1 text-xs font-medium', status.tone)}>
      {Icon && <Icon aria-hidden="true" className="size-3.5" />}
      {status.label}
    </span>
  );
}

/**
 * DataColumnDataAvailability - Page-specific component for visualizing data column availability
 *
 * Displays a heatmap showing when each data column was first seen:
 * - X-axis: 128 data columns (0-127)
 * - Y-axis: Blobs (shows range "0 → n" when >6 blobs, individual labels otherwise)
 * - Cell color: Non-linear gradient based on time when column was first seen
 *   - Green (0-3s) → Yellow (3-3.5s) → Red (3.5-4s)
 *   - Pure green for first 3 seconds, rapid transition to red in final second
 *   - 4000ms deadline for "on time" determination
 *   - 1px spacing between columns for better visibility
 * - Each row shows the same column data (columns are independent of blobs)
 * - Fixed height of 400px regardless of blob count
 *
 * Title includes two status indicators on the right:
 * 1. Data availability: "Data available" (green, >= 64 columns before the deadline), "No blobs" when
 *    the block carries none, "Waiting for columns" until the deadline passes in the slot replay, and
 *    "Data not available" (red) only once the deadline has passed with fewer than 64 columns
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
  blockBlobCount,
  firstSeenData = [],
  maxTime = 4000,
  className,
}: DataColumnDataAvailabilityProps): JSX.Element {
  const { PERFORMANCE_TIME_COLORS } = getDataVizColors();

  // Calculate on-time columns (< 4000ms deadline)
  const onTimeColumnCount = useMemo(() => {
    return firstSeenData.filter(point => point.time < 4000).length;
  }, [firstSeenData]);

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
      <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-1">
        <h3 className="text-sm/6 font-semibold text-foreground">Data column availability</h3>
        <div className="flex items-center gap-3">
          <AvailabilityStatus
            blobCount={blockBlobCount === undefined ? blobCount : blockBlobCount}
            onTimeColumnCount={onTimeColumnCount}
            deadlineMs={4000}
          />
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
            // 0-3s (0-75%): Stay green - repeat to hold green longer
            PERFORMANCE_TIME_COLORS.excellent,
            PERFORMANCE_TIME_COLORS.excellent,
            PERFORMANCE_TIME_COLORS.excellent,
            PERFORMANCE_TIME_COLORS.excellent,
            // 3-3.5s (75-87.5%): green → yellow
            PERFORMANCE_TIME_COLORS.fair,
            // 3.5-4s (87.5-100%): yellow → red
            PERFORMANCE_TIME_COLORS.poor,
          ]}
          showVisualMap={true}
          showCellBorders={true}
          animationDuration={0}
          emphasisDisabled={false}
          visualMapText={['4s', '0s']}
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
