import type { JSX } from 'react';
import { getConsensusClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { rowsByBucket, type HistoryRow, type NodeHistory } from '../../hooks/useNodeHistory';
import { axisCeiling, formatMs } from '../../utils/node-stats';
import { TimeSeriesChart } from '../TimeSeriesChart';

export interface PerNodeHistoryChartProps {
  title: string;
  subtitle?: string;
  anchorId: string;
  history: NodeHistory;
  /** Bucket starts where each node was behind the network; those points are left out of its line */
  behindOf?: (nodeId: string) => Set<number>;
}

/**
 * One median line per node with data in the range, coloured by the node's latest consensus client.
 */
export function PerNodeHistoryChart({
  title,
  subtitle,
  anchorId,
  history,
  behindOf,
}: PerNodeHistoryChartProps): JSX.Element {
  // Each node's latest row, most recently seen node first
  const latest = new Map<string, HistoryRow>();
  history.rows.forEach(row => {
    const current = latest.get(row.nodeId);
    if (!current || row.start > current.start) latest.set(row.nodeId, row);
  });
  const nodes = [...latest.values()].sort((a, b) => b.start - a.start);

  const lines = nodes.map(({ nodeId, client: latestClient }, index) => {
    const byBucket = rowsByBucket(history.rows, nodeId);
    const client = latestClient || 'unknown';
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
      series={lines.map(line => ({
        name: nameOf(line),
        client: line.client,
        data: line.values,
        color: line.color,
        lineWidth: 1.5,
      }))}
      tooltipRows={index =>
        lines
          .filter(line => line.raw[index] !== null)
          .sort((a, b) => a.raw[index]! - b.raw[index]!)
          .map(line => ({
            color: line.color,
            client: line.client,
            label: line.behind[index] ? `${nameOf(line)}, catching up` : nameOf(line),
            value: formatMs(line.raw[index]),
          }))
      }
      syncGroup="contributor-history"
    />
  );
}
