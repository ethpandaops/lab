import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intAttestationFirstSeenServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useLatencyChartSeries } from '../../hooks/useLatencyChartData';
import { useSlotWindowQuery } from '../../hooks/useSlotWindowQuery';
import { useNetwork } from '@/hooks/useNetwork';

export interface AttestationLatencyChartProps {
  username: string;
}

/**
 * Line chart showing attestation propagation latency for a contributor's nodes.
 *
 * Displays aggregated `seen_slot_start_diff` (ms) from IntAttestationFirstSeen over slots.
 * Multiple attestations occur per slot (one per validator per committee), so this chart
 * aggregates by computing average latency per slot.
 *
 * Lower latency = faster attestation propagation = better network positioning.
 *
 * @param username - Contributor username to filter data
 */
export function AttestationLatencyChart({ username }: AttestationLatencyChartProps): JSX.Element {
  const queryRange = useSlotWindowQuery(20);
  const { currentNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery({
    ...intAttestationFirstSeenServiceListOptions({
      query: {
        username_eq: username,
        slot_start_date_time_gte: queryRange?.slot_start_date_time_gte,
        slot_start_date_time_lte: queryRange?.slot_start_date_time_lte,
        page_size: 10000, // Attestations are more numerous
        order_by: 'slot_start_date_time ASC',
      },
    }),
    enabled: !!queryRange && !!currentNetwork,
    placeholderData: previousData => previousData,
  });

  const { series, minSlot, maxSlot, dataCount } = useLatencyChartSeries(
    data,
    'int_attestation_first_seen'
  );

  // Only show loading skeleton on initial load, not on refetch
  if (isLoading) {
    return <LoadingContainer className="h-[400px]" />;
  }

  if (error) {
    return (
      <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
        Error loading attestation data: {error.message}
      </div>
    );
  }

  if (dataCount === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-sm border border-border bg-surface text-muted">
        No attestation data available for this time range
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
        name: 'Avg Latency (ms)',
      }}
      title="Attestation Propagation Latency"
      subtitle={`${dataCount} observations · Average time from slot start until attestation first seen by each node (per slot)`}
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
          const avgLatency = param.data[1];
          html += `<span style="color:${param.color}">●</span> ${param.seriesName}: ${avgLatency.toFixed(1)}ms<br/>`;
        });
        return html;
      }}
    />
  );
}
