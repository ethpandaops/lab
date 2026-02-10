import { z } from 'zod';
import type { SeriesData } from '@/components/Charts/MultiLine';

/** Available time period options for chart display */
export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '180d' | '1y' | '2y' | 'all';

/** Zod schema for consensus overview search params */
export const consensusOverviewSearchSchema = z.object({
  t: z.enum(['24h', '7d', '30d', '90d', '180d', '1y', '2y', 'all']).optional(),
});
export type ConsensusOverviewSearch = z.infer<typeof consensusOverviewSearchSchema>;

/** Configuration for each time range option */
export const TIME_RANGE_CONFIG = {
  '24h': { days: 1, dataType: 'hourly' as const, pageSize: 24 },
  '7d': { days: 7, dataType: 'hourly' as const, pageSize: 168 },
  '30d': { days: 30, dataType: 'daily' as const, pageSize: 30 },
  '90d': { days: 90, dataType: 'daily' as const, pageSize: 90 },
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
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '180d' },
  { value: '1y', label: '1y' },
  { value: '2y', label: '2y' },
  { value: 'all', label: 'All' },
] as const;
