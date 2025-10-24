import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctBlockBlobFirstSeenByNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useLatencyChartSeries } from '../../hooks/useLatencyChartData';
import { useSlotWindowQuery } from '../../hooks/useSlotWindowQuery';
import { useNetwork } from '@/hooks/useNetwork';

export interface BlobLatencyChartProps {
  username: string;
}

/**
 * Line chart showing blob propagation latency for a contributor's nodes.
 *
 * Displays `seen_slot_start_diff` (ms) from FctBlockBlobFirstSeenByNode over slots.
 * Blobs were introduced in EIP-4844 (Deneb upgrade) for cheaper L2 data availability.
 *
 * Lower latency = faster blob propagation = better network positioning.
 *
 * @param username - Contributor username to filter data
 */
export function BlobLatencyChart({ username }: BlobLatencyChartProps): JSX.Element {
  const queryRange = useSlotWindowQuery(20);
  const { currentNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery({
    ...fctBlockBlobFirstSeenByNodeServiceListOptions({
      query: {
        username_eq: username,
        slot_start_date_time_gte: queryRange?.slot_start_date_time_gte,
        slot_start_date_time_lte: queryRange?.slot_start_date_time_lte,
        page_size: 1000,
        order_by: 'slot_start_date_time ASC',
      },
    }),
    enabled: !!queryRange && !!currentNetwork,
    placeholderData: previousData => previousData,
  });

  const { series, minSlot, maxSlot, dataCount } = useLatencyChartSeries(data, 'fct_block_blob_first_seen_by_node');

  // Only show loading skeleton on initial load, not on refetch
  if (isLoading) {
    return <LoadingContainer className="h-[400px]" />;
  }

  if (error) {
    return (
      <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
        Error loading blob data: {error.message}
      </div>
    );
  }

  if (dataCount === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-sm border border-border bg-surface text-muted">
        No blob data available for this time range
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
      height={300}
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
