import { z } from 'zod';

export type TimePeriod = '7d' | '30d' | '90d' | '180d' | 'all';

export const entityDetailSearchSchema = z.object({
  tab: z.enum(['validators', 'recent', 'attestations', 'blocks']).default('validators'),
  t: z.enum(['7d', '30d', '90d', '180d', 'all']).optional(),
});

export const TIME_RANGE_CONFIG = {
  '7d': { days: 7 },
  '30d': { days: 30 },
  '90d': { days: 90 },
  '180d': { days: 180 },
  all: { days: null },
} as const;

export const TIME_PERIOD_OPTIONS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '180d' },
  { value: 'all', label: 'All' },
] as const;
