import type { JSX } from 'react';
import { getConsensusClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface PerNodeHistoryChartProps {
  title: string;
  subtitle?: string;
  anchorId: string;
  history: NodeHistory;
  /** Node IDs to draw, one line each */
  nodeIds: string[];
  /** Line label per node, e.g. its client */
  clientOf: (nodeId: string) => string | undefined;
}

/**
 * One median line per node over time, coloured by each node's consensus client.
 */
export function PerNodeHistoryChart({
  title,
  subtitle,
  anchorId,
  history,
  nodeIds,
  clientOf,
}: PerNodeHistoryChartProps): JSX.Element {
  const lines = nodeIds.map((nodeId, index) => {
    const byBucket = rowsByBucket(history.rows, nodeId);
    const client = clientOf(nodeId) ?? 'unknown';
    return {
      nodeId,
      client,
      color: getConsensusClientColor(client, index),
      values: history.buckets.map(start => byBucket.get(start)?.p50 ?? null),
    };
  });
  // Two nodes on one client would share a colour, so a node's ID is always in its name
  const nameOf = (line: (typeof lines)[number]): string => `${formatClientName(line.client)} · ${line.nodeId}`;

  return (
    <TimeSeriesChart
      title={title}
      subtitle={subtitle}
      anchorId={anchorId}
      buckets={history.buckets}
      granularity={history.granularity}
      height={300}
      yMax={axisCeiling(lines.flatMap(line => line.values))}
      empty={history.rows.length === 0 ? 'No data in this range' : undefined}
      series={lines.map(line => ({ name: nameOf(line), data: line.values, color: line.color, lineWidth: 1.5 }))}
      tooltipRows={index =>
        lines
          .filter(line => line.values[index] !== null)
          .sort((a, b) => a.values[index]! - b.values[index]!)
          .map(line => ({ color: line.color, label: nameOf(line), value: formatMs(line.values[index]) }))
      }
      syncGroup="contributor-history"
    />
  );
}
