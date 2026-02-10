import type { SeriesData } from '@/components/Charts/MultiLine';

/** Available time period options for chart display */
export type TimePeriod = '7d' | '30d' | '90d' | '180d' | '1y' | '2y' | 'all';

/** Configuration for each time range option */
export const TIME_RANGE_CONFIG = {
  '7d': { days: 7, dataType: 'hourly' as const, pageSize: 168 },
  '30d': { days: 30, dataType: 'hourly' as const, pageSize: 720 },
  '90d': { days: 90, dataType: 'hourly' as const, pageSize: 2160 },
  '180d': { days: 180, dataType: 'daily' as const, pageSize: 180 },
  '1y': { days: 365, dataType: 'daily' as const, pageSize: 365 },
  '2y': { days: 730, dataType: 'daily' as const, pageSize: 730 },
  all: { days: null, dataType: 'daily' as const, pageSize: 10000 },
} as const;

/** Chart configuration with labels and series data */
export interface ChartConfig {
  labels: string[];
  series: SeriesData[];
}

/** Time period selector options for UI rendering */
export const TIME_PERIOD_OPTIONS = [
  { value: '7d' as const, label: '7d' },
  { value: '30d' as const, label: '30d' },
  // TODO: Enable when data is available
  // { value: '90d' as const, label: '90d' },
  // { value: '180d' as const, label: '180d' },
  // { value: '1y' as const, label: '1y' },
  // { value: '2y' as const, label: '2y' },
  { value: 'all' as const, label: 'All' },
] as const;
