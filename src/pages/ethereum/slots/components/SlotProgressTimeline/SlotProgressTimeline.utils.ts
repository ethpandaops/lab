/**
 * Utility functions for the SlotProgressTimeline component.
 */

import { SLOT_DURATION_MS } from './constants';
import type { TraceSpan } from './SlotProgressTimeline.types';

/** Format milliseconds to readable string */
export function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

/** Calculate percentage position on timeline */
export function msToPercent(ms: number): number {
  return Math.min(Math.max((ms / SLOT_DURATION_MS) * 100, 0), 100);
}

/** Map classification string to category for color coding */
export function classificationToCategory(classification: string): TraceSpan['category'] {
  const lower = classification.toLowerCase();
  if (lower === 'internal') return 'internal';
  if (lower === 'individual') return 'individual';
  // Default to individual for unknown classifications
  return 'individual';
}

/** Extract a short, unique node identifier from the full node name */
export function getShortNodeId(nodeName: string): string {
  // Node names are typically like: pub-asn-city/username/hashed-abc123
  // We want to extract just the unique part (hashed-abc123 or just abc123)
  const parts = nodeName.split('/');
  const lastPart = parts[parts.length - 1] || nodeName;
  // If it starts with 'hashed-', just show the hash
  if (lastPart.startsWith('hashed-')) {
    return lastPart.slice(7); // Remove 'hashed-' prefix
  }
  return lastPart;
}

/**
 * Calculate IQR-based bounds for outlier detection.
 * Returns [lowerBound, upperBound] where values outside this range are outliers.
 * Uses 1.5 * IQR which is the standard Tukey fence for moderate outliers.
 */
export function calculateOutlierBounds(values: number[]): { lower: number; upper: number } | null {
  if (values.length < 4) return null; // Need at least 4 values for meaningful IQR

  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  // Use 1.5 * IQR as the standard fence
  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
}

/**
 * Filter values to exclude outliers based on IQR.
 * Returns only values within the acceptable range.
 */
export function filterOutliers(values: number[]): number[] {
  const bounds = calculateOutlierBounds(values);
  if (!bounds) return values; // Not enough data for outlier detection

  return values.filter(v => v >= bounds.lower && v <= bounds.upper);
}
