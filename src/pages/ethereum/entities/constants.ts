import { z } from 'zod';
import { blockSearchShape } from '@/pages/ethereum/clients/utils/block-filters';

/** Window the entities overview compares stake over */
export type EntitiesWindow = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

export const entitiesSearchSchema = z.object({
  t: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).optional(),
});

/** Days each window spans; `null` reaches back to genesis */
export const ENTITIES_WINDOW_DAYS: Record<EntitiesWindow, number | null> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
};

export const ENTITIES_WINDOW_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
] as const;

/** Entities that bucket unrelated validators rather than name an operator; left out of concentration figures */
export const AGGREGATE_ENTITIES = new Set(['unknown', 'solo_stakers']);

/**
 * Epochs the liveness figures read, spread evenly across the range. Liveness is stored per slot (about 450 rows an
 * epoch with a miss on mainnet), so reading every epoch of a long range is too much for the browser.
 */
export const LIVENESS_SAMPLE_EPOCHS = 64;

/** Ranges up to this many epochs (a little over a day) read every epoch instead of sampling */
export const LIVENESS_FULL_EPOCHS = 256;

export type TimePeriod = '7d' | '30d' | '90d' | '180d' | 'all';

export const entityDetailSearchSchema = z.object({
  tab: z.enum(['validators', 'recent', 'attestations', 'blocks', 'clients']).default('validators'),
  t: z.enum(['7d', '30d', '90d', '180d', 'all']).optional(),
  /** Blocks tab filters, sort and page */
  ...blockSearchShape,
  /** Blocks tab status; absent means canonical */
  status: z.enum(['orphaned', 'missed']).optional().catch(undefined),
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
