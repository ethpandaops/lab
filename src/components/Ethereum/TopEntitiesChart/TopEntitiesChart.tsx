import { useMemo } from 'react';

import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Alert } from '@/components/Feedback/Alert';
import { PopoutCard } from '@/components/Layout/PopoutCard';

import type { TopEntitiesChartProps } from './TopEntitiesChart.types';

/**
 * TopEntitiesChart - Reusable chart for visualizing top N entities by a metric over time
 *
 * Displays multiple time series lines, one for each of the top N entities ranked by
 * total metric value. Works with any x-axis granularity (slot, epoch, block, timestamp).
 *
 * Common use cases:
 * - Missed attestations by validator/entity over slots/epochs
 * - Block production by entity over time
 * - Transaction volume by address over blocks
 * - Any "top N by metric" pattern
 *
 * Features:
 * - Automatically ranks entities by total metric value
 * - Selects top N entities for display (or all entities if topN is Infinity)
 * - Fills in missing data points with 0 across the full x-axis range
 * - Shows total metric count in subtitle
 * - Handles empty data gracefully
 * - Scrollable legend when showing all entities
 *
 * @example Missed attestations by slot (top 10)
 * ```tsx
 * <TopEntitiesChart
 *   data={missedAttestations.map(m => ({
 *     x: m.slot,
 *     entity: m.validatorName,
 *     count: m.missedCount
 *   }))}
 *   xAxis={{ name: 'Slot' }}
 *   yAxis={{ name: 'Missed Attestations' }}
 *   title="Offline Validators"
 *   topN={10}
 * />
 * ```
 *
 * @example All entities (scrollable)
 * ```tsx
 * <TopEntitiesChart
 *   data={missedAttestations.map(m => ({
 *     x: m.slot,
 *     entity: m.validatorName,
 *     count: m.missedCount
 *   }))}
 *   xAxis={{ name: 'Slot' }}
 *   yAxis={{ name: 'Missed Attestations' }}
 *   title="Offline Validators"
 *   topN={Infinity}
 * />
 * ```
 *
 * @example Block production by epoch
 * ```tsx
 * <TopEntitiesChart
 *   data={blocks.map(b => ({
 *     x: b.epoch,
 *     entity: b.builderName,
 *     count: 1  // Count blocks
 *   }))}
 *   xAxis={{ name: 'Epoch' }}
 *   yAxis={{ name: 'Blocks Produced' }}
 *   title="Top Block Builders"
 *   topN={5}
 * />
 * ```
 */
export function TopEntitiesChart({
  data,
  xAxis,
  yAxis,
  topN = 10,
  title = 'Top Entities',
  subtitle,
  height,
  anchorId,
  inModal = false,
  modalSize = 'full',
  emptyMessage = 'No data available',
  relativeSlots,
  syncGroup,
}: TopEntitiesChartProps): React.JSX.Element {
  const { topEntities, series, minX, maxX, totalCount } = useMemo(() => {
    if (data.length === 0) {
      return { topEntities: [], series: [], minX: 0, maxX: 0, totalCount: 0 };
    }

    // Aggregate total count per entity
    const entityTotals = new Map<string, number>();
    data.forEach(record => {
      const current = entityTotals.get(record.entity) ?? 0;
      entityTotals.set(record.entity, current + record.count);
    });

    // Get top N entities by total count (or all if topN is Infinity)
    const sortedEntities = Array.from(entityTotals.entries()).sort((a, b) => b[1] - a[1]);
    const topEntities =
      topN === Infinity
        ? sortedEntities.map(([entity]) => entity)
        : sortedEntities.slice(0, topN).map(([entity]) => entity);

    if (topEntities.length === 0) {
      return { topEntities: [], series: [], minX: 0, maxX: 0, totalCount: 0 };
    }

    // Calculate x-axis range (use provided or calculate from data)
    const allX = [...new Set(data.map(d => d.x))].sort((a, b) => a - b);
    const minX = xAxis.min ?? allX[0];
    const maxX = xAxis.max ?? allX[allX.length - 1];

    // Build series data for each entity
    // Create a map of entity -> x -> count
    const entityXMap = new Map<string, Map<number, number>>();
    topEntities.forEach(entity => {
      entityXMap.set(entity, new Map());
    });

    data
      .filter(record => topEntities.includes(record.entity))
      .forEach(record => {
        const xMap = entityXMap.get(record.entity);
        if (xMap) {
          const current = xMap.get(record.x) ?? 0;
          xMap.set(record.x, current + record.count);
        }
      });

    // Convert to series format for MultiLineChart
    const series = topEntities.map(entity => {
      const xMap = entityXMap.get(entity)!;
      // Create data points for full x-axis range (fill with 0 if no data)
      const seriesData: Array<[number, number]> = [];
      for (let x = minX; x <= maxX; x++) {
        const count = xMap.get(x) ?? 0;
        seriesData.push([x, count]);
      }

      return {
        name: entity,
        data: seriesData,
        showSymbol: false, // Don't show symbols for cleaner lines
        smooth: false, // Use linear interpolation for count data
      };
    });

    // Calculate total count for subtitle
    const totalCount = data.reduce((sum, d) => sum + d.count, 0);

    return {
      topEntities,
      series,
      minX,
      maxX,
      totalCount,
    };
  }, [data, xAxis.min, xAxis.max, topN]);

  // Calculate dynamic subtitle if not provided
  const effectiveSubtitle =
    subtitle ??
    `${totalCount.toLocaleString()} total across ${topEntities.length} ${topEntities.length === 1 ? 'entity' : 'entities'}`;

  const chartHeight = height ?? (inModal ? 600 : 400);

  // Handle empty state
  if (series.length === 0) {
    return (
      <PopoutCard title={title} subtitle={emptyMessage} anchorId={anchorId} modalSize={modalSize}>
        {() => <Alert variant="info" title="No Data" description={emptyMessage} />}
      </PopoutCard>
    );
  }

  return (
    <PopoutCard title={title} subtitle={effectiveSubtitle} anchorId={anchorId} modalSize={modalSize}>
      {({ inModal: isInModal }) => (
        <MultiLineChart
          series={series}
          xAxis={{
            type: 'value',
            name: xAxis.name,
            min: minX,
            max: maxX,
            formatter: xAxis.formatter,
          }}
          yAxis={{
            name: yAxis.name,
          }}
          height={isInModal ? 600 : chartHeight}
          showLegend={true}
          enableDataZoom={true}
          relativeSlots={relativeSlots}
          syncGroup={syncGroup}
        />
      )}
    </PopoutCard>
  );
}
