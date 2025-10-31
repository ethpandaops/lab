import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { Alert } from '@/components/Feedback/Alert';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useLatencyChartSeries } from '../../hooks/useLatencyChartData';
import { useSlotWindowQuery } from '../../hooks/useSlotWindowQuery';
import { useNetwork } from '@/hooks/useNetwork';
import { meetsMinVersion } from '@/utils';

export interface DataColumnLatencyChartProps {
  username: string;
  nodes: FctNodeActiveLast24h[];
}

/**
 * Line chart showing data column propagation latency for a contributor's nodes.
 *
 * Displays `seen_slot_start_diff` (ms) from FctBlockDataColumnSidecarFirstSeenByNode over slots.
 * Data columns were introduced in PeerDAS (Fusaka upgrade) for improved data availability sampling.
 *
 * Lower latency = faster data column propagation = better network positioning.
 *
 * @param username - Contributor username to filter data
 * @param nodes - List of active nodes for version checking
 */
export function DataColumnLatencyChart({ username, nodes }: DataColumnLatencyChartProps): JSX.Element {
  const queryRange = useSlotWindowQuery(20);
  const { currentNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery({
    ...fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions({
      query: {
        username_eq: username,
        slot_start_date_time_gte: queryRange?.slot_start_date_time_gte,
        slot_start_date_time_lte: queryRange?.slot_start_date_time_lte,
        page_size: 10000,
        order_by: 'slot_start_date_time ASC',
      },
    }),
    enabled: !!queryRange && !!currentNetwork,
    placeholderData: previousData => previousData,
  });

  const { series, minSlot, maxSlot, dataCount } = useLatencyChartSeries(
    data,
    'fct_block_data_column_sidecar_first_seen_by_node'
  );

  // Only show loading skeleton on initial load, not on refetch
  if (isLoading) {
    return <LoadingContainer className="h-[400px]" />;
  }

  if (error) {
    return (
      <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
        Error loading data column data: {error.message}
      </div>
    );
  }

  if (dataCount === 0) {
    // Check if all nodes are running contributoor version < v0.0.70
    const allNodesOldVersion = nodes.every(node => {
      const version = node.meta_client_version;
      if (!version) return false; // If no version, we can't determine
      return !meetsMinVersion(version, 'v0.0.70');
    });

    // Show warning if nodes are running old versions
    if (allNodesOldVersion && nodes.length > 0) {
      return (
        <div className="space-y-4">
          <Alert
            variant="info"
            description={
              <>
                Data column data collection requires{' '}
                <a
                  href="https://github.com/ethpandaops/contributoor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:no-underline"
                >
                  contributoor
                </a>{' '}
                v0.0.70 or later. If this is your node, please upgrade your contributoor to view data column metrics.
              </>
            }
          />
        </div>
      );
    }

    return (
      <div className="flex h-[400px] items-center justify-center rounded-sm border border-border bg-surface text-muted">
        No data column data available for this time range
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
      showLegend={series.length > 1 && series.length <= 5}
      enableSeriesFilter={series.length > 5}
      enableDataZoom={true}
      enableAggregateToggle={true}
      tooltipTrigger={series.length > 5 ? 'item' : 'axis'}
      tooltipFormatter={(params: unknown) => {
        // Handle item-based tooltip (when >5 series)
        if (series.length > 5) {
          const param = params as { data: [number, number]; color: string; seriesName: string };
          if (!param || !param.data) return '';
          const slot = param.data[0];
          const latency = param.data[1];
          let html = `<strong>Slot:</strong> ${slot.toLocaleString()}<br/>`;
          html += `<span style="color:${param.color}">●</span> <strong>${param.seriesName}</strong><br/>`;
          html += `<div style="padding-left: 12px; line-height: 1.6;">`;
          html += `Latency: <strong>${latency.toFixed(0)}ms</strong>`;
          html += `</div>`;
          return html;
        }

        // Handle axis-based tooltip (when ≤5 series)
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
