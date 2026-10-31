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
  /** Bucket starts where each node was behind the network; those points are left out of its line */
  behindOf?: (nodeId: string) => Set<number>;
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
  behindOf,
}: PerNodeHistoryChartProps): JSX.Element {
  const lines = nodeIds.map((nodeId, index) => {
    const byBucket = rowsByBucket(history.rows, nodeId);
    const client = clientOf(nodeId) ?? 'unknown';
    const behind = behindOf?.(nodeId) ?? new Set<number>();
    const raw = history.buckets.map(start => byBucket.get(start)?.p50 ?? null);
    return {
      nodeId,
      client,
      color: getConsensusClientColor(client, index),
      raw,
      behind: history.buckets.map(start => behind.has(start)),
      // Hours a node spent catching up would flatten every other line
      values: raw.map((value, bucket) => (behind.has(history.buckets[bucket]) ? null : value)),
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
          .filter(line => line.raw[index] !== null)
          .sort((a, b) => a.raw[index]! - b.raw[index]!)
          .map(line => ({
            color: line.color,
            label: line.behind[index] ? `${nameOf(line)}, catching up` : nameOf(line),
            value: formatMs(line.raw[index]),
          }))
      }
      syncGroup="contributor-history"
    />
  );
}
