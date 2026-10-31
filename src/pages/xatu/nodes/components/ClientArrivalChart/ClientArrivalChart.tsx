import type { JSX } from 'react';
import { getConsensusClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import type { NodeHistory } from '../../hooks/useNodeHistory';
import { medianByClient, medianByStart } from '../../utils/history';
import { formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface ClientArrivalChartProps {
  /** Block rollups of every node */
  history: NodeHistory;
  rangeLabel: string;
}

/**
 * Median block arrival of each consensus client's nodes over time.
 */
export function ClientArrivalChart({ history, rangeLabel }: ClientArrivalChartProps): JSX.Element {
  const clients = medianByClient(history.rows, history.buckets, medianByStart(history.rows));
  const colors = clients.map((client, index) => getConsensusClientColor(client.client, index));

  return (
    <TimeSeriesChart
      title="Block arrival by consensus client"
      subtitle={`Median of each client's nodes, ${rangeLabel.toLowerCase()}`}
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
          .sort((a, b) => a.value! - b.value!)
          .map(({ client, clientIndex, value }) => ({
            color: colors[clientIndex],
            label: formatClientName(client.client),
            value: formatMs(value),
          }))
      }
      syncGroup="nodes-overview"
    />
  );
}
