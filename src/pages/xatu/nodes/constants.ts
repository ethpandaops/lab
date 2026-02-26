import { z } from 'zod';

export type TimePeriod = '24h' | '7d' | '31d';

export const nodesSearchSchema = z.object({
  t: z.enum(['24h', '7d', '31d']).optional(),
});
export type NodesSearch = z.infer<typeof nodesSearchSchema>;

export const TIME_RANGE_CONFIG = {
  '24h': { days: 1, dataType: 'hourly' as const, pageSize: 5000 },
  '7d': { days: 7, dataType: 'hourly' as const, pageSize: 10000 },
  '31d': { days: 31, dataType: 'daily' as const, pageSize: 5000 },
} as const;

export const TIME_PERIOD_OPTIONS = [
  { value: '24h' as const, label: '24h' },
  { value: '7d' as const, label: '7d' },
  { value: '31d' as const, label: '31d' },
] as const;
