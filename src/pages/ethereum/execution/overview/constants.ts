import { z } from 'zod';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { getDataVizColors } from '@/utils/dataVizColors';

const { DATA_COLORS } = getDataVizColors();

/** Available time period options for chart display */
export type TimePeriod = '7d' | '30d' | '90d' | '180d' | '1y' | '2y' | 'all';

/** Zod schema for execution overview search params */
export const executionOverviewSearchSchema = z.object({
  t: z.enum(['7d', '30d', '90d', '180d', '1y', '2y', 'all']).optional(),
});
export type ExecutionOverviewSearch = z.infer<typeof executionOverviewSearchSchema>;

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

/**
 * Gas limit signalling bands (in millions)
 * Index 0: 0-30M, Index 1: 30-36M, Index 2: 36-45M, Index 3: 45-60M, Index 4: 60-75M, Index 5: 75M+
 * Colors go from cool (blue) to hot (red)
 */
export const GAS_BANDS = [
  { max: 30_000_000, label: '0-30M', color: DATA_COLORS.blue },
  { max: 36_000_000, label: '30-36M', color: DATA_COLORS.cyan },
  { max: 45_000_000, label: '36-45M', color: DATA_COLORS.green },
  { max: 60_000_000, label: '45-60M', color: DATA_COLORS.orange },
  { max: 75_000_000, label: '60-75M', color: DATA_COLORS.red },
  { max: Infinity, label: '75M+', color: DATA_COLORS.rose },
] as const;

/** Time period selector options for UI rendering */
export const TIME_PERIOD_OPTIONS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '180d' },
  { value: '1y', label: '1y' },
  { value: '2y', label: '2y' },
  { value: 'all', label: 'All' },
] as const;
