const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

interface ByteScale {
  divisor: number;
  unit: string;
}

/**
 * Determine the appropriate display unit for byte-based values.
 * Returns a divisor to apply to values so they render in a human-friendly unit.
 *
 * @param maxValue - The largest value in the dataset (in baseUnit)
 * @param baseUnit - The unit the raw values are already expressed in
 */
export function getByteScale(maxValue: number, baseUnit: 'KB' | 'MB'): ByteScale {
  const baseIndex = BYTE_UNITS.indexOf(baseUnit);
  let divisor = 1;
  let unitIndex = baseIndex;

  while (maxValue / divisor >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    divisor *= 1024;
    unitIndex++;
  }

  return { divisor, unit: BYTE_UNITS[unitIndex] };
}

/**
 * Format a numeric value with adaptive precision to avoid duplicate y-axis labels.
 * Picks decimal places based on value magnitude.
 */
export function formatScaled(value: number, unit: string): string {
  if (value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);
  if (abs >= 100) return `${Math.round(value)} ${unit}`;
  if (abs >= 1) return `${value.toFixed(1)} ${unit}`;
  return `${value.toFixed(2)} ${unit}`;
}

/**
 * Format a percentage with adaptive precision to avoid duplicate y-axis labels.
 */
export function formatPercent(value: number): string {
  if (value === 0) return '0%';
  const abs = Math.abs(value);
  if (abs >= 10) return `${Math.round(value)}%`;
  if (abs >= 1) return `${value.toFixed(1)}%`;
  if (abs >= 0.1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(3)}%`;
}

/**
 * Find the max y-value across all series data points.
 * Accepts the broad SeriesData.data union type.
 */
export function seriesMax(series: { data: unknown[] }[]): number {
  let max = 0;
  for (const s of series) {
    for (const point of s.data) {
      const y = Array.isArray(point) ? (point[1] as number) : (point as number);
      if (typeof y === 'number' && isFinite(y) && y > max) max = y;
    }
  }
  return max;
}
