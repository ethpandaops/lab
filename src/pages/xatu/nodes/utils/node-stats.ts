import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { compareVersions } from '@/utils/version';
import { ONLINE_THRESHOLD_SECONDS } from '../constants';

/** Distribution summary of a set of millisecond timings */
export interface Summary {
  count: number;
  min: number;
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  max: number;
}

/**
 * Quantile of an ascending-sorted array using linear interpolation between ranks.
 *
 * @param sorted - Values sorted ascending
 * @param q - Quantile in [0, 1]
 */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/**
 * Median of an unsorted array, or null when it is empty.
 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  return quantile(
    [...values].sort((a, b) => a - b),
    0.5
  );
}

/**
 * Summarise a set of timings, or null when there are none.
 */
export function summarize(values: number[]): Summary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    p10: quantile(sorted, 0.1),
    p50: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}

/**
 * Share of other nodes that were slower than `value` (strictly larger timing).
 *
 * @param value - This node's timing
 * @param others - Timings of every other node
 * @returns Fraction in [0, 1], or null when there is nothing to compare against
 */
export function shareSlowerThan(value: number, others: number[]): number | null {
  if (others.length === 0) return null;
  return others.filter(other => other > value).length / others.length;
}

/**
 * Whether a node reported recently enough to count as online.
 *
 * @param lastSeen - Unix seconds the node last reported
 * @param nowSeconds - Current unix seconds
 */
export function isNodeOnline(lastSeen: number | undefined, nowSeconds: number): boolean {
  if (!lastSeen) return false;
  return nowSeconds - lastSeen <= ONLINE_THRESHOLD_SECONDS;
}

/**
 * Slot window ending before the in-progress slot, aligned to `step` so it only moves every few slots.
 *
 * @returns `startSlot` inclusive, `endSlot` exclusive
 */
export function getSlotWindow(currentSlot: number, size: number, step: number): { startSlot: number; endSlot: number } {
  const endSlot = Math.floor((currentSlot - 1) / step) * step;
  return { startSlot: Math.max(0, endSlot - size), endSlot };
}

/**
 * Count values into fixed-width buckets from `minMs`; values outside the range land in the first or last bucket.
 *
 * @returns Bucket lower bounds (ms) and counts
 */
export function histogram(
  values: number[],
  bucketMs: number,
  maxMs: number,
  minMs = 0
): { starts: number[]; counts: number[] } {
  const bucketCount = Math.ceil((maxMs - minMs) / bucketMs);
  const counts = new Array<number>(bucketCount).fill(0);
  values.forEach(value => {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((value - minMs) / bucketMs)));
    counts[index]++;
  });
  return { starts: counts.map((_, i) => minMs + i * bucketMs), counts };
}

/**
 * Format a millisecond timing, e.g. "1,842 ms"; "–" when missing.
 */
export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '–';
  return `${Math.round(ms).toLocaleString()} ms`;
}

/**
 * City and country of a node, falling back to whichever is known.
 */
export function formatNodeLocation(
  node: Pick<FctNodeActiveLast24h, 'meta_client_geo_city' | 'meta_client_geo_country'>
): string {
  const { meta_client_geo_city: city, meta_client_geo_country: country } = node;
  if (city && country) return `${city}, ${country}`;
  return country || city || 'Unknown';
}

/** Step of the performance gradient (`--color-performance-*`) an arrival time falls in */
export type ArrivalTier = 'excellent' | 'good' | 'fair' | 'slow' | 'poor';

/**
 * Performance tier of an arrival time, one tier per second from slot start.
 */
export function getArrivalTier(ms: number): ArrivalTier {
  if (ms < 1000) return 'excellent';
  if (ms < 2000) return 'good';
  if (ms < 3000) return 'fair';
  if (ms < 4000) return 'slow';
  return 'poor';
}

/**
 * Newest client version reported per collector implementation (e.g. Contributoor, Xatu).
 */
export function getLatestVersions(nodes: FctNodeActiveLast24h[]): Map<string, string> {
  const latest = new Map<string, string>();
  nodes.forEach(node => {
    const implementation = node.meta_client_implementation;
    const version = node.meta_client_version;
    if (!implementation || !version) return;
    const current = latest.get(implementation);
    if (!current || compareVersions(version, current) > 0) latest.set(implementation, version);
  });
  return latest;
}

/**
 * Release part of a client version, dropping build suffixes: "v26.10.2-0abc0d1" → "v26.10.2".
 */
export function shortVersion(version: string | undefined): string {
  return version?.split(/[-+\s]/)[0] ?? '';
}

/**
 * Y-axis maximum that keeps rare spikes from flattening a chart: 1.2× the 98th percentile, rounded up
 * to a whole power-of-ten step. Undefined when nothing exceeds it, so the axis scales on its own.
 */
export function axisCeiling(values: (number | null)[]): number | undefined {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const target = quantile(sorted, 0.98) * 1.2;
  if (target <= 0 || sorted[sorted.length - 1] <= target) return undefined;
  const step = 10 ** Math.floor(Math.log10(target));
  return Math.ceil(target / step) * step;
}

/**
 * End (exclusive) of the slots any node has reported yet, so recent slots still being ingested aren't read as gaps.
 */
export function getIngestedEndSlot(slots: Array<{ slot: number; nodeCount: number }>, fallback: number): number {
  for (let index = slots.length - 1; index >= 0; index--) {
    if (slots[index].nodeCount > 0) return slots[index].slot + 1;
  }
  return fallback;
}
