import { z } from 'zod';
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

/**
 * Gas limit signalling bands. Each band is half-open, [previous max, max), so a round target
 * such as 60M falls in the band that starts at it. Signalled limits are rounded up to whole
 * millions, so the labels list the inclusive range of values each band holds.
 * Colors go from cool (blue) to hot (red)
 */
export const GAS_BANDS = [
  { max: 30_000_000, label: '<30M', color: DATA_COLORS.blue },
  { max: 36_000_000, label: '30–35M', color: DATA_COLORS.cyan },
  { max: 45_000_000, label: '36–44M', color: DATA_COLORS.green },
  { max: 60_000_000, label: '45–59M', color: DATA_COLORS.orange },
  { max: 75_000_000, label: '60–74M', color: DATA_COLORS.red },
  { max: Infinity, label: '≥75M', color: DATA_COLORS.rose },
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
