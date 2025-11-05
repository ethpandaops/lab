import { type JSX, useMemo } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BarChart } from '@/components/Charts/Bar';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import { getForkForSlot } from '@/utils/beacon';
import { useNetwork } from '@/hooks/useNetwork';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { BlobDataColumnSpreadChartProps, NodeSpreadStats } from './BlobDataColumnSpreadChart.types';

/**
 * BlobDataColumnSpreadChart - Visualizes the spread (time difference) between first and last
 * blob/data column observations across the network.
 *
 * Shows two views:
 * 1. Overall spread: treats all nodes as one, showing min-of-mins to max-of-maxs per blob/column
 * 2. Per-node distribution: shows spread distribution across individual nodes
 *
 * @example
 * ```tsx
 * <BlobDataColumnSpreadChart
 *   blobPropagationData={[...]}
 *   forkVersion="deneb"
 * />
 * ```
 */
export function BlobDataColumnSpreadChart({ blobPropagationData, slot }: BlobDataColumnSpreadChartProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  // Determine the active fork for this slot
  const forkVersion = getForkForSlot(slot, currentNetwork);

  // Determine if we're in Fulu or later (data columns) vs earlier forks (blobs)
  const isDataColumn = forkVersion === 'fulu';
  const itemType = isDataColumn ? 'data column' : 'blob';

  // Calculate overall spread statistic
  // For each blob/column, find the earliest time ANY node saw it
  // Then spread = latest blob/column first seen time - earliest blob/column first seen time
  const overallSpread = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return null;
    }

    // Group by blob/column index and find earliest time for each
    const itemEarliestTimes = new Map<number, number>();

    blobPropagationData.forEach(point => {
      // Filter out outliers > 12s
      if (point.seen_slot_start_diff <= 12000) {
        // Use column_index for Fulu+, blob_index for pre-Fulu
        const index = point.column_index !== undefined ? point.column_index : point.blob_index;

        if (index !== undefined) {
          const currentEarliest = itemEarliestTimes.get(index);
          if (currentEarliest === undefined || point.seen_slot_start_diff < currentEarliest) {
            itemEarliestTimes.set(index, point.seen_slot_start_diff);
          }
        }
      }
    });

    if (itemEarliestTimes.size === 0) {
      return null;
    }

    // Get the earliest and latest blob/column first-seen times
    const earliestTimes = Array.from(itemEarliestTimes.values());
    const firstItemTime = Math.min(...earliestTimes);
    const lastItemTime = Math.max(...earliestTimes);
    const spread = lastItemTime - firstItemTime;

    return {
      firstItemTime,
      lastItemTime,
      spread,
      itemCount: itemEarliestTimes.size,
      itemEarliestTimes, // For detailed view if needed
    };
  }, [blobPropagationData]);

  // Calculate per-node spread distribution
  const { barData, barLabels, bucketSize } = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return { barData: [], barLabels: [], bucketSize: 100 };
    }

    // Group by node - collect all times this node saw any blob/column
    const nodeGroups = new Map<string, number[]>();
    blobPropagationData.forEach(point => {
      // Filter out outliers > 12s
      if (point.seen_slot_start_diff <= 12000) {
        // Only count if we have a valid index
        const index = point.column_index !== undefined ? point.column_index : point.blob_index;
        if (index !== undefined) {
          if (!nodeGroups.has(point.node_id)) {
            nodeGroups.set(point.node_id, []);
          }
          nodeGroups.get(point.node_id)!.push(point.seen_slot_start_diff);
        }
      }
    });

    // Calculate spread for each node
    const stats: NodeSpreadStats[] = Array.from(nodeGroups.entries())
      .map(([nodeId, times]) => {
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        return {
          nodeId,
          minTime,
          maxTime,
          spread: maxTime - minTime,
          observationCount: times.length,
        };
      })
      .sort((a, b) => a.spread - b.spread);

    if (stats.length === 0) {
      return { barData: [], barLabels: [], bucketSize: 100 };
    }

    // Create histogram data - distribution of spreads across nodes
    // Determine dynamic bucket size based on data range
    const maxSpread = Math.max(...stats.map(s => s.spread));
    const minSpread = Math.min(...stats.map(s => s.spread));
    const range = maxSpread - minSpread;

    // Calculate bucket size to aim for ~10-20 buckets
    let bucketSize = 100; // Default 100ms
    if (range > 2000) {
      bucketSize = 200; // 200ms for larger ranges
    } else if (range > 1000) {
      bucketSize = 100; // 100ms for medium ranges
    } else if (range > 500) {
      bucketSize = 50; // 50ms for smaller ranges
    } else {
      bucketSize = 25; // 25ms for very tight ranges
    }

    const spreadBuckets = new Map<number, number>();

    stats.forEach(stat => {
      const bucket = Math.floor(stat.spread / bucketSize) * bucketSize;
      spreadBuckets.set(bucket, (spreadBuckets.get(bucket) || 0) + 1);
    });

    // Convert to sorted array for bar chart
    const sortedBuckets = Array.from(spreadBuckets.entries()).sort((a, b) => a[0] - b[0]);

    const data = sortedBuckets.map(([, count]) => count);
    const labels = sortedBuckets.map(([bucket]) => `${bucket}-${bucket + bucketSize}ms`);

    return { barData: data, barLabels: labels, bucketSize };
  }, [blobPropagationData]);

  // Handle empty data
  if (blobPropagationData.length === 0) {
    return (
      <PopoutCard
        title={`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Spread`}
        anchorId="blob-datacolumn-spread-chart"
        modalSize="xl"
      >
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-72 items-center justify-center text-muted'
            }
          >
            <p>No {itemType} propagation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `Time from when first ${itemType} became available to when last ${itemType} became available`;

  // Capitalize title properly - "Blob Spread" or "Data Column Spread"
  const title = itemType === 'data column' ? 'Data Column Spread' : 'Blob Spread';

  return (
    <PopoutCard title={title} subtitle={subtitle} anchorId="blob-datacolumn-spread-chart" modalSize="xl">
      {({ inModal }) => {
        // Determine spread quality: fast <500ms, medium 500ms-1s, large >1s
        const spreadColor = overallSpread
          ? overallSpread.spread < 500
            ? 'var(--color-success)'
            : overallSpread.spread < 1000
              ? 'var(--color-warning)'
              : 'var(--color-danger)'
          : 'var(--color-primary)';

        const spreadIcon = overallSpread ? (
          overallSpread.spread < 500 ? (
            <CheckCircleIcon className="size-5" />
          ) : overallSpread.spread < 1000 ? (
            <ExclamationTriangleIcon className="size-5" />
          ) : (
            <XCircleIcon className="size-5" />
          )
        ) : null;

        return (
          <div className={inModal ? 'space-y-8' : 'space-y-6'}>
            {/* Network Level Metrics */}
            {overallSpread !== null && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">Network Level</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MiniStat
                    label="Spread"
                    value={`${(overallSpread.spread / 1000).toFixed(3)}s`}
                    icon={spreadIcon}
                    color={spreadColor}
                  />
                  <MiniStat label="First Available" value={`${(overallSpread.firstItemTime / 1000).toFixed(3)}s`} />
                  <MiniStat label="Last Available" value={`${(overallSpread.lastItemTime / 1000).toFixed(3)}s`} />
                </div>
              </div>
            )}

            {/* Per-Node Distribution */}
            {barData.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Per-Node Spread Distribution</h4>
                <p className="mb-4 text-xs text-muted">Number of nodes by spread time ({bucketSize}ms buckets)</p>
                <BarChart
                  data={barData}
                  labels={barLabels}
                  height={inModal ? 400 : 250}
                  axisName="Node Count"
                  showLabel={false}
                  color={CHART_CATEGORICAL_COLORS[2]}
                />
              </div>
            )}
          </div>
        );
      }}
    </PopoutCard>
  );
}
