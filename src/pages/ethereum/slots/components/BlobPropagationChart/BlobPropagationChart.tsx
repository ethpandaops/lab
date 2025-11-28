import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { BoxPlot, calculateBoxPlotStats } from '@/components/Charts/BoxPlot';
import type { BoxPlotData, BoxPlotDataItem } from '@/components/Charts/BoxPlot';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils/dataVizColors';
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
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  // Determine if we're dealing with data columns (many indices) or blobs (few indices)
  const isDataColumns = useMemo(() => {
    if (blobPropagationData.length === 0) return false;
    // Check if any point has column_index (indicates data columns)
    return blobPropagationData.some(p => p.column_index !== undefined);
  }, [blobPropagationData]);

  // Process data into box plot format (single series with multiple data points) - for blobs
  const { boxPlotSeries, categories } = useMemo(() => {
    if (blobPropagationData.length === 0 || isDataColumns) {
      return { boxPlotSeries: [], categories: [] };
    }

    // Group propagation times by blob/column index, filtering outliers > 12s
    const blobGroups = new Map<number, number[]>();
    blobPropagationData.forEach(point => {
      // Use column_index for Fulu+, blob_index for pre-Fulu
      const index = point.column_index !== undefined ? point.column_index : point.blob_index;
      const timeMs = point.seen_slot_start_diff;

      // Filter out outliers > 12 seconds (12000ms)
      if (timeMs <= 12000 && index !== undefined) {
        if (!blobGroups.has(index)) {
          blobGroups.set(index, []);
        }
        blobGroups.get(index)!.push(timeMs);
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
  }, [blobPropagationData, CHART_CATEGORICAL_COLORS, isDataColumns]);

  // Process data into statistical band format (for data columns)
  const bandChartSeries = useMemo(() => {
    if (blobPropagationData.length === 0 || !isDataColumns) {
      return [];
    }

    // Group propagation times by column index
    const columnGroups = new Map<number, number[]>();
    blobPropagationData.forEach(point => {
      const index = point.column_index !== undefined ? point.column_index : point.blob_index;
      const timeMs = point.seen_slot_start_diff;

      // Filter out outliers > 12 seconds (12000ms)
      if (timeMs <= 12000 && index !== undefined) {
        if (!columnGroups.has(index)) {
          columnGroups.set(index, []);
        }
        columnGroups.get(index)!.push(timeMs);
      }
    });

    // Get sorted column indices
    const columnIndices = Array.from(columnGroups.keys()).sort((a, b) => a - b);

    // Calculate percentiles for each column
    const calculatePercentile = (sortedValues: number[], percentile: number): number => {
      const index = (percentile / 100) * (sortedValues.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
    };

    const minData: [number, number | null][] = [];
    const p05Data: [number, number | null][] = [];
    const p50Data: [number, number | null][] = []; // median
    const p90Data: [number, number | null][] = [];
    const maxData: [number, number | null][] = [];

    columnIndices.forEach(colIndex => {
      const times = columnGroups.get(colIndex)!.sort((a, b) => a - b);

      minData.push([colIndex, times[0] / 1000]); // Convert to seconds
      p05Data.push([colIndex, calculatePercentile(times, 5) / 1000]);
      p50Data.push([colIndex, calculatePercentile(times, 50) / 1000]);
      p90Data.push([colIndex, calculatePercentile(times, 90) / 1000]);
      maxData.push([colIndex, times[times.length - 1] / 1000]);
    });

    // Create multi-line series matching BlockArrivalTimesChart style
    const series = [
      // Min boundary (outer band, lower)
      {
        name: 'Min',
        data: minData,
        color: CHART_CATEGORICAL_COLORS[3],
        smooth: true,
        showSymbol: false,
        lineWidth: 1,
        lineStyle: 'dotted' as const,
        showArea: false,
      },
      // P05 boundary (inner band, lower)
      {
        name: 'P05',
        data: p05Data,
        color: CHART_CATEGORICAL_COLORS[0],
        smooth: true,
        showSymbol: false,
        lineWidth: 1.5,
        lineStyle: 'dashed' as const,
        showArea: true,
        areaOpacity: 0.1,
      },
      // P50 (median) - main line
      {
        name: 'Median (P50)',
        data: p50Data,
        color: CHART_CATEGORICAL_COLORS[2],
        smooth: true,
        showSymbol: false,
        lineWidth: 3,
        lineStyle: 'solid' as const,
        showArea: false,
      },
      // P90 boundary (inner band, upper)
      {
        name: 'P90',
        data: p90Data,
        color: CHART_CATEGORICAL_COLORS[1],
        smooth: true,
        showSymbol: false,
        lineWidth: 1.5,
        lineStyle: 'dashed' as const,
        showArea: true,
        areaOpacity: 0.1,
      },
      // Max boundary (outer band, upper) - hidden by default
      {
        name: 'Max',
        data: maxData,
        color: CHART_CATEGORICAL_COLORS[4],
        smooth: true,
        showSymbol: false,
        lineWidth: 1,
        lineStyle: 'dotted' as const,
        showArea: false,
        visible: false,
      },
    ];

    return series;
  }, [blobPropagationData, isDataColumns, CHART_CATEGORICAL_COLORS]);

  // Calculate statistics for header
  const { blobCount, medianPropagationTime, totalObservations } = useMemo(() => {
    if (blobPropagationData.length === 0) {
      return { blobCount: 0, medianPropagationTime: 0, totalObservations: 0 };
    }

    const uniqueBlobs = new Set(
      blobPropagationData.map(p => (p.column_index !== undefined ? p.column_index : p.blob_index))
    );

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

  const itemType = isDataColumns ? 'data column' : 'blob';
  const itemTypePlural = isDataColumns ? 'data columns' : 'blobs';
  const title = isDataColumns ? 'Data Column Propagation' : 'Blob Propagation';
  const subtitle = `${blobCount} ${blobCount === 1 ? itemType : itemTypePlural} • Median: ${(medianPropagationTime / 1000).toFixed(2)}s • ${totalObservations.toLocaleString()} observations`;

  return (
    <PopoutCard
      title={title}
      anchorId="blob-propagation-chart"
      subtitle={subtitle}
      modalSize={isDataColumns ? 'full' : 'xl'}
    >
      {({ inModal }) => (
        <>
          {isDataColumns ? (
            <MultiLineChart
              series={bandChartSeries}
              xAxis={{
                type: 'value',
                name: 'Data Column Index',
                min: 0,
                max: 127,
              }}
              yAxis={{
                name: 'Slot Time (s)',
                formatter: (value: number | string) => (typeof value === 'number' ? value.toFixed(1) : value),
                valueDecimals: 1,
              }}
              tooltipFormatter={(params: unknown) => {
                if (!params || !Array.isArray(params)) return '';
                const columnIndex = params[0]?.axisValue as number;
                let tooltip = `<strong>Column ${columnIndex}</strong><br/>`;
                params.forEach((param: { value: [number, number]; marker: string; seriesName: string }) => {
                  const valueInSeconds = param.value[1];
                  const valueInMs = Math.round(valueInSeconds * 1000);
                  tooltip += `${param.marker} ${param.seriesName}: ${valueInMs}ms<br/>`;
                });
                return tooltip;
              }}
              height={inModal ? 500 : 300}
              showLegend={true}
              enableDataZoom={true}
            />
          ) : (
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
        </>
      )}
    </PopoutCard>
  );
}
