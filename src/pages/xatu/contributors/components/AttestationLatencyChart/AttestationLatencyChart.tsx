import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctAttestationObservationByNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { Alert } from '@/components/Feedback/Alert';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { formatSlot } from '@/utils';
import { usePreAggregatedLatencyChartSeries } from '../../hooks/usePreAggregatedLatencyChartSeries';
import { useSlotWindowQuery } from '../../hooks/useSlotWindowQuery';
import { useNetwork } from '@/hooks/useNetwork';

export interface AttestationLatencyChartProps {
  username: string;
}

/**
 * Line chart showing attestation propagation latency for a contributor's nodes.
 *
 * Displays pre-aggregated `median_seen_slot_start_diff` (ms) from fct_attestation_observation_by_node.
 * Each data point represents the median latency across all attestations observed by a node in a slot.
 * Tooltips include min/max range statistics when available.
 *
 * Lower latency = faster attestation propagation = better network positioning.
 * Median is used instead of average as it's more robust to outliers.
 *
 * @param username - Contributor username to filter data
 */
export function AttestationLatencyChart({ username }: AttestationLatencyChartProps): JSX.Element {
  const queryRange = useSlotWindowQuery(20);
  const { currentNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery({
    ...fctAttestationObservationByNodeServiceListOptions({
      query: {
        username_eq: username,
        slot_start_date_time_gte: queryRange?.slot_start_date_time_gte,
        slot_start_date_time_lte: queryRange?.slot_start_date_time_lte,
        page_size: 10000, // Pre-aggregated: one record per slot per node
        order_by: 'slot_start_date_time ASC',
      },
    }),
    enabled: !!queryRange && !!currentNetwork,
    placeholderData: previousData => previousData,
  });

  const { series, minSlot, maxSlot, dataCount } = usePreAggregatedLatencyChartSeries(
    data,
    'fct_attestation_observation_by_node'
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
      <div className="space-y-4">
        <Alert
          variant="info"
          description={
            <>
              Attestation data collection is opt-in. If this is your node and you&apos;d like to view attestation
              metrics, please enable attestation forwarding in your{' '}
              <a
                href="https://github.com/ethpandaops/contributoor"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:no-underline"
              >
                contributoor
              </a>{' '}
              configuration.
            </>
          }
        />
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
        formatter: (value: number | string) => formatSlot(Number(value)),
      }}
      yAxis={{
        name: 'Median Latency (ms)',
      }}
      height={300}
      showLegend={series.length > 1 && series.length <= 5}
      enableSeriesFilter={series.length > 5}
      enableDataZoom={true}
      enableAggregateToggle={false}
      tooltipTrigger="item"
      tooltipFormatter={(params: unknown) => {
        // With 'item' trigger, params is a single object (not an array)
        const param = params as {
          data: { value: [number, number]; min?: number; max?: number; avg?: number };
          color: string;
          seriesName: string;
        };

        if (!param || !param.data) return '';

        const slot = param.data.value[0];
        const medianLatency = param.data.value[1];

        let html = `<strong>Slot:</strong> ${formatSlot(slot)}<br/>`;
        html += `<span style="color:${param.color}">●</span> <strong>${param.seriesName}</strong><br/>`;
        html += `<div style="padding-left: 12px; line-height: 1.6;">`;
        html += `Median: <strong>${medianLatency.toFixed(1)}ms</strong><br/>`;

        if (param.data.min !== undefined) {
          html += `Min: ${param.data.min.toFixed(1)}ms<br/>`;
        }

        if (param.data.max !== undefined) {
          html += `Max: ${param.data.max.toFixed(1)}ms<br/>`;
        }

        html += `</div>`;

        return html;
      }}
    />
  );
}
