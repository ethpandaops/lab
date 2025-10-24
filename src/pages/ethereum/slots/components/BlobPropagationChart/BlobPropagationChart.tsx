import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { ScatterChart } from '@/components/Charts/Scatter';
import type { ScatterSeries } from '@/components/Charts/Scatter';
import { BLOB_COLORS } from '@/theme/data-visualization-colors';
import type { BlobPropagationChartProps } from './BlobPropagationChart.types';

/**
 * BlobPropagationChart - Visualizes blob propagation timing across the network
 *
 * Shows blob propagation using a multi-series scatter plot where each blob index
 * is a separate series with distinct colors. Y-axis shows blob index with jitter
 * to display multiple nodes at same time/blob.
 *
 * @example
 * ```tsx
 * <BlobPropagationChart
 *   blobPropagationData={[
 *     { blob_index: 0, seen_slot_start_diff: 850, node_id: 'node1', meta_client_geo_continent_code: 'EU' },
 *     { blob_index: 1, seen_slot_start_diff: 920, node_id: 'node2', meta_client_geo_continent_code: 'NA' },
 *     ...
 *   ]}
 * />
 * ```
 */
export function BlobPropagationChart({ blobPropagationData }: BlobPropagationChartProps): JSX.Element {
  // Process data into scatter series
  const scatterSeries = useMemo((): ScatterSeries[] => {
    if (blobPropagationData.length === 0) {
      return [];
    }

    // Group data by blob index for separate scatter series
    const blobGroups = new Map<number, Array<[number, number]>>();
    blobPropagationData.forEach(point => {
      const blobIndex = point.blob_index;
      if (!blobGroups.has(blobIndex)) {
        blobGroups.set(blobIndex, []);
      }
      // X = time in seconds, Y = blob index with jitter
      const jitter = (Math.random() - 0.5) * 0.3; // ±0.15 jitter
      blobGroups.get(blobIndex)!.push([point.seen_slot_start_diff / 1000, blobIndex + jitter]);
    });

    // Get unique blob indices and sort them
    const blobIndices = Array.from(blobGroups.keys()).sort((a, b) => a - b);

    // Create scatter series for each blob index
    return blobIndices.map(blobIndex => ({
      name: `Blob ${blobIndex}`,
      data: blobGroups.get(blobIndex)!,
      color: BLOB_COLORS[blobIndex],
      symbolSize: 7,
    }));
  }, [blobPropagationData]);

  const maxBlobIndex = useMemo(() => {
    if (scatterSeries.length === 0) return 0;
    return Math.max(...scatterSeries.map(s => parseInt(s.name.split(' ')[1])));
  }, [scatterSeries]);

  // Calculate statistics for header
  const { blobCount, avgPropagationTime, totalNodes } = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return { blobCount: 0, avgPropagationTime: 0, totalNodes: 0 };
    }

    const uniqueBlobs = new Set(blobPropagationData.map(p => p.blob_index));
    const total = blobPropagationData.reduce((sum, point) => sum + point.seen_slot_start_diff, 0);
    const avg = total / blobPropagationData.length;

    return {
      blobCount: uniqueBlobs.size,
      avgPropagationTime: avg,
      totalNodes: blobPropagationData.length,
    };
  }, [blobPropagationData]);

  // Handle empty data
  if (blobPropagationData.length === 0) {
    return (
      <PopoutCard title="Blob Propagation" modalSize="xl">
        {({ inModal }) => (
          <div
            className={
              inModal
                ? 'flex h-96 items-center justify-center text-muted'
                : 'flex h-72 items-center justify-center text-muted'
            }
          >
            <p>No blob propagation data available</p>
          </div>
        )}
      </PopoutCard>
    );
  }

  const subtitle = `${blobCount} ${blobCount === 1 ? 'blob' : 'blobs'} • Avg: ${avgPropagationTime.toFixed(0)}ms • ${totalNodes.toLocaleString()} observations`;

  return (
    <PopoutCard title="Blob Propagation" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <div className={inModal ? 'h-96' : 'h-72'}>
          <ScatterChart
            series={scatterSeries}
            xAxisTitle="Time from Slot Start (s)"
            yAxisTitle="Blob Index"
            height="100%"
            xMin={0}
            xMax={12}
            yMin={-0.5}
            yMax={maxBlobIndex + 0.5}
            showLegend={true}
            legendPosition="bottom"
          />
        </div>
      )}
    </PopoutCard>
  );
}
