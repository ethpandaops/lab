import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BoxPlot, calculateBoxPlotStats } from '@/components/Charts/BoxPlot';
import type { BoxPlotData, BoxPlotDataItem } from '@/components/Charts/BoxPlot';
import { CHART_CATEGORICAL_COLORS } from '@/theme/data-visualization-colors';
import type { BlobPropagationChartProps } from './BlobPropagationChart.types';

/**
 * BlobPropagationChart - Visualizes blob propagation timing distribution across the network
 *
 * Shows blob propagation using box plots where each blob index displays the statistical
 * distribution (min, Q1, median, Q3, max) of propagation times across all nodes.
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
  // Process data into box plot format (single series with multiple data points)
  const { boxPlotSeries, categories } = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return { boxPlotSeries: [], categories: [] };
    }

    // Group propagation times by blob index, filtering outliers > 12s
    const blobGroups = new Map<number, number[]>();
    blobPropagationData.forEach(point => {
      const blobIndex = point.blob_index;
      const timeMs = point.seen_slot_start_diff;

      // Filter out outliers > 12 seconds (12000ms)
      if (timeMs <= 12000) {
        if (!blobGroups.has(blobIndex)) {
          blobGroups.set(blobIndex, []);
        }
        blobGroups.get(blobIndex)!.push(timeMs);
      }
    });

    // Get unique blob indices and sort them
    const blobIndices = Array.from(blobGroups.keys()).sort((a, b) => a - b);

    // Calculate stats for each blob with individual colors from theme
    const allStats: BoxPlotDataItem[] = blobIndices.map((blobIndex, idx) => {
      const times = blobGroups.get(blobIndex)!;
      const stats = calculateBoxPlotStats(times);

      // Return data point with itemStyle for individual coloring using theme colors
      const color = CHART_CATEGORICAL_COLORS[idx % CHART_CATEGORICAL_COLORS.length];
      return {
        value: stats,
        itemStyle: {
          color,
          borderColor: color,
        },
      };
    });

    // Create categories (blob names)
    const cats = blobIndices.map(idx => `Blob ${idx}`);

    // Create a single series with all blob data
    const series: BoxPlotData[] = [
      {
        name: 'Blob Propagation',
        data: allStats,
      },
    ];

    return { boxPlotSeries: series, categories: cats };
  }, [blobPropagationData]);

  // Calculate statistics for header
  const { blobCount, medianPropagationTime, totalObservations } = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return { blobCount: 0, medianPropagationTime: 0, totalObservations: 0 };
    }

    const uniqueBlobs = new Set(blobPropagationData.map(p => p.blob_index));

    // Calculate overall median propagation time
    const allTimes = blobPropagationData.map(p => p.seen_slot_start_diff).sort((a, b) => a - b);
    const median = allTimes[Math.floor(allTimes.length / 2)];

    return {
      blobCount: uniqueBlobs.size,
      medianPropagationTime: median,
      totalObservations: blobPropagationData.length,
    };
  }, [blobPropagationData]);

  // Handle empty data
  if (blobPropagationData.length === 0) {
    return (
      <PopoutCard title="Blob Propagation" anchorId="blob-propagation-chart" modalSize="xl">
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

  const subtitle = `${blobCount} ${blobCount === 1 ? 'blob' : 'blobs'} • Median: ${(medianPropagationTime / 1000).toFixed(2)}s • ${totalObservations.toLocaleString()} observations`;

  return (
    <PopoutCard title="Blob Propagation" anchorId="blob-propagation-chart" subtitle={subtitle} modalSize="xl">
      {({ inModal }) => (
        <div className={inModal ? 'h-96' : 'h-72'}>
          <BoxPlot
            series={boxPlotSeries}
            categories={categories}
            yAxisTitle="Propagation Time (s)"
            yAxisFormatter={(value: number) => `${(value / 1000).toFixed(0)}`}
            height="100%"
            showLegend={false}
            yMin={0}
            boxWidth="40%"
          />
        </div>
      )}
    </PopoutCard>
  );
}
