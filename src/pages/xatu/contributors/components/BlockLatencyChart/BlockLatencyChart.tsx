import { type JSX } from 'react';
import { fctBlockFirstSeenByNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { ListFctBlockFirstSeenByNodeResponse } from '@/api/types.gen';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useLatencyChartData } from '../../hooks/useLatencyChartData';

export interface BlockLatencyChartProps {
  username: string;
}

/**
 * Line chart showing block propagation latency for a contributor's nodes.
 *
 * Displays `seen_slot_start_diff` (ms) from FctBlockFirstSeenByNode over slots.
 * Each data point represents when a block was first observed by the contributor's
 * nodes relative to slot start time.
 *
 * Lower latency = faster block propagation = better network positioning.
 *
 * @param username - Contributor username to filter data
 */
export function BlockLatencyChart({ username }: BlockLatencyChartProps): JSX.Element {
  const { series, minSlot, maxSlot, isLoading, error, dataCount } =
    useLatencyChartData<ListFctBlockFirstSeenByNodeResponse>(
      username,
      fctBlockFirstSeenByNodeServiceListOptions,
      'fct_block_first_seen_by_node'
    );

  // Only show loading skeleton on initial load, not on refetch
  if (isLoading) {
    return <LoadingContainer className="h-[400px]" />;
  }

  if (error) {
    return (
      <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
        Error loading block data: {error.message}
      </div>
    );
  }

  if (dataCount === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-sm border border-border bg-surface text-muted">
        No block data available for this time range
      </div>
    );
  }

  return (
    <MultiLineChart
      series={series}
      xAxis={{
        type: 'value',
        name: 'Slot',
        min: minSlot,
        max: maxSlot,
        formatter: (value: number | string) => Number(value).toLocaleString(),
      }}
      yAxis={{
        name: 'Latency (ms)',
      }}
      title="Block Propagation Latency"
      subtitle={`${dataCount} observations · Average time from slot start until block first seen by each node`}
      height={300}
      showCard={true}
      showLegend={series.length > 1}
      enableDataZoom={true}
      enableAggregateToggle={true}
      tooltipFormatter={(params: unknown) => {
        if (!params || !Array.isArray(params) || params.length === 0) return '';
        const firstParam = params[0] as { axisValue: number };
        const slot = firstParam.axisValue;
        let html = `<strong>Slot:</strong> ${slot.toLocaleString()}<br/>`;
        params.forEach((param: { data: [number, number]; color: string; seriesName: string }) => {
          const latency = param.data[1];
          html += `<span style="color:${param.color}">●</span> ${param.seriesName}: ${latency.toFixed(0)}ms<br/>`;
        });
        return html;
      }}
    />
  );
}
