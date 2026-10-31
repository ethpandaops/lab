import { BEHIND_MS } from '../constants';
import type { HistoryRow } from '../hooks/useNodeHistory';
import { median, quantile } from './node-stats';
import { weightedMedian } from './time-buckets';

/** Spread of node medians in one bucket */
export interface BucketSpread {
  p10: number | null;
  p50: number | null;
  p90: number | null;
  nodeCount: number;
}

/**
 * Per bucket, the p10, median and p90 of every node's median, aligned to `buckets`.
 */
export function spreadByBucket(rows: HistoryRow[], buckets: number[]): BucketSpread[] {
  const byBucket = new Map<number, number[]>();
  rows.forEach(row => {
    if (!byBucket.has(row.start)) byBucket.set(row.start, []);
    byBucket.get(row.start)!.push(row.p50);
  });
  return buckets.map(start => {
    const values = (byBucket.get(start) ?? []).sort((a, b) => a - b);
    if (values.length === 0) return { p10: null, p50: null, p90: null, nodeCount: 0 };
    return {
      p10: quantile(values, 0.1),
      p50: quantile(values, 0.5),
      p90: quantile(values, 0.9),
      nodeCount: values.length,
    };
  });
}

/**
 * Median of every node's median per bucket start: the network's typical arrival in that hour or day.
 */
export function medianByStart(rows: HistoryRow[]): Map<number, number> {
  const byStart = new Map<number, number[]>();
  rows.forEach(row => {
    if (!byStart.has(row.start)) byStart.set(row.start, []);
    byStart.get(row.start)!.push(row.p50);
  });
  const medians = new Map<number, number>();
  byStart.forEach((values, start) => medians.set(start, median(values)!));
  return medians;
}

/**
 * Whether a node's bucket trails the network median by more than a slot, i.e. the node was catching up.
 */
export function isBehind(row: HistoryRow, networkMedians: Map<number, number>): boolean {
  const network = networkMedians.get(row.start);
  return network !== undefined && row.p50 - network > BEHIND_MS;
}

/**
 * Bucket starts where a node was behind the network.
 */
export function behindStarts(rows: HistoryRow[], networkMedians: Map<number, number>): Set<number> {
  return new Set(rows.filter(row => isBehind(row, networkMedians)).map(row => row.start));
}

/**
 * Median of node medians per consensus client per bucket, largest client first.
 * Nodes behind the network are left out, so one syncing node can't drag a client with few nodes.
 */
export function medianByClient(
  rows: HistoryRow[],
  buckets: number[],
  networkMedians: Map<number, number> = new Map()
): Array<{ client: string; nodeCount: number; p50: (number | null)[] }> {
  const byClient = new Map<string, { nodes: Set<string>; byBucket: Map<number, number[]> }>();
  rows.forEach(row => {
    const client = row.client.toLowerCase() || 'unknown';
    if (!byClient.has(client)) byClient.set(client, { nodes: new Set(), byBucket: new Map() });
    const entry = byClient.get(client)!;
    entry.nodes.add(row.nodeId);
    if (isBehind(row, networkMedians)) return;
    if (!entry.byBucket.has(row.start)) entry.byBucket.set(row.start, []);
    entry.byBucket.get(row.start)!.push(row.p50);
  });
  return [...byClient.entries()]
    .map(([client, { nodes, byBucket }]) => ({
      client,
      nodeCount: nodes.size,
      p50: buckets.map(start => median(byBucket.get(start) ?? [])),
    }))
    .sort((a, b) => b.nodeCount - a.nodeCount);
}

/** One node over a whole range */
export interface RangeSummary {
  /** Slot-weighted median of the bucket medians */
  p50: number;
  count: number;
}

/**
 * Each node's typical value over the range, weighting every bucket median by the slots it covers.
 */
export function summarizeByNode(rows: HistoryRow[]): Map<string, RangeSummary> {
  const byNode = new Map<string, HistoryRow[]>();
  rows.forEach(row => {
    if (!byNode.has(row.nodeId)) byNode.set(row.nodeId, []);
    byNode.get(row.nodeId)!.push(row);
  });
  const summaries = new Map<string, RangeSummary>();
  byNode.forEach((nodeRows, nodeId) => {
    const p50 = weightedMedian(nodeRows.map(row => ({ value: row.p50, weight: row.count })));
    if (p50 !== null) summaries.set(nodeId, { p50, count: nodeRows.reduce((sum, row) => sum + row.count, 0) });
  });
  return summaries;
}

/**
 * Slot-weighted median of one field across a node's buckets, or null without data.
 */
export function rangeValue(rows: HistoryRow[], field: 'p50' | 'p90' | 'p95' | 'firstP50'): number | null {
  return weightedMedian(
    rows.flatMap(row => {
      const value = row[field];
      return value === null || value === undefined ? [] : [{ value, weight: row.count }];
    })
  );
}
