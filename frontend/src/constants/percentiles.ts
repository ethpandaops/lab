export const PERCENTILE_COLORS = {
  max: '#ff4444',
  p95: '#ff8800',
  p75: '#ffcc00',
  p50: '#00ff9f',
  p25: '#00ffff',
  p05: '#2563eb',
  min: '#9333ea',
} as const;

export const PERCENTILE_LABELS = {
  max: 'Maximum',
  p95: '95th Percentile',
  p75: '75th Percentile',
  p50: 'Median',
  p25: '25th Percentile',
  p05: '5th Percentile',
  min: 'Minimum',
} as const;

export const PERCENTILE_KEYS = {
  max: 'max',
  p95: 'p95',
  p75: 'p75',
  p50: 'p50',
  p25: 'p25',
  p05: 'p05',
  min: 'min',
} as const;

export type PercentileKey = keyof typeof PERCENTILE_KEYS;
