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
  if (q1 === undefined || q3 === undefined) return null;
  const iqr = q3 - q1;

  // Use 1.5 * IQR as the standard fence
  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
}
