/**
 * Shared utilities for node resource charts (CPU, Memory, Disk I/O, Network I/O).
 *
 * These constants and helpers are used across multiple chart components in the
 * slot deep-dive NodeResources section.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal ECharts tooltip callback parameter shape used by chart formatters. */
export interface EChartsTooltipParam {
  marker: string;
  seriesName: string;
  value: [number, number] | number;
  axisValue?: number | string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Width of each time bucket (in seconds) for slot-time aggregation. */
export const SLOT_BUCKET_SIZE = 0.25;

/** Pre-computed array of all bucket boundaries from 0 to 12 seconds (inclusive). */
export const ALL_SLOT_BUCKETS: number[] = Array.from({ length: 49 }, (_, i) => i * SLOT_BUCKET_SIZE);

/** Slot phase boundary colors: cyan (block), green (attestation), amber (aggregation). */
export const PHASE_BOUNDARY_COLORS = ['#22d3ee', '#22c55e', '#f59e0b'];

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/** Convert microseconds to seconds. */
export function usToSeconds(us: number): number {
  return us / 1_000_000;
}

/** Capitalize the first character of a string. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert bytes to kilobytes. */
export function bytesToKB(b: number): number {
  return b / 1024;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/** Snap an offset (in seconds) to the nearest slot bucket boundary. */
export function toSlotBucket(offsetSec: number): number {
  return Math.round(offsetSec / SLOT_BUCKET_SIZE) * SLOT_BUCKET_SIZE;
}

/** Arithmetic mean of a number array. */
export function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
