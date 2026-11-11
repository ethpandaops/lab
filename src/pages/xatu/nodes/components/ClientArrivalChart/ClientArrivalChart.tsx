import type { JSX } from 'react';
import { getConsensusClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import type { NodeHistory } from '@/pages/xatu/nodes/hooks/useNodeHistory';
import { medianByClient } from '@/pages/xatu/nodes/utils/history';
import { formatMs } from '@/pages/xatu/nodes/utils/node-stats';
import { TimeSeriesChart } from '@/pages/xatu/nodes/components/TimeSeriesChart';

export interface ClientArrivalChartProps {
  /** Block rollups of every node */
  history: NodeHistory;
  /** Network median by bucket start, to leave out nodes that were catching up */
  networkMedians: Map<number, number>;
  rangeLabel: string;
}

/**
 * Median block arrival of each consensus client's nodes over time.
 */
export function ClientArrivalChart({ history, networkMedians, rangeLabel }: ClientArrivalChartProps): JSX.Element {
  const clients = medianByClient(history.rows, history.buckets, networkMedians);
  const colors = clients.map((client, index) => getConsensusClientColor(client.client, index));

  return (
    <TimeSeriesChart
      title="Block arrival by consensus client"
      subtitle={`Median of each client's node IDs, ${rangeLabel.toLowerCase()}`}
      anchorId="client-block-arrival"
      buckets={history.buckets}
      granularity={history.granularity}
      series={clients.map((client, index) => ({
        name: formatClientName(client.client),
        data: client.p50,
        color: colors[index],
        lineWidth: 1.5,
      }))}
      tooltipRows={index =>
        clients
          .map((client, clientIndex) => ({ client, clientIndex, value: client.p50[index] }))
          .filter(entry => entry.value !== null)
          .map(({ client, clientIndex, value }) => ({
            color: colors[clientIndex],
            client: client.client,
            label: formatClientName(client.client),
            value: formatMs(value),
          }))
      }
      syncGroup="nodes-overview"
    />
  );
}
