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

/** Window the entity page reads its performance and validator history over */
export type DetailWindow = '7d' | '30d' | '90d' | '1y' | 'all';

export const DETAIL_WINDOW_OPTIONS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
] as const;

/** Days each window spans; `null` reaches back to the first day of data */
export const DETAIL_WINDOW_DAYS: Record<DetailWindow, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
};

export const entityDetailSearchSchema = z.object({
  tab: z.enum(['performance', 'stake', 'blocks', 'clients']).default('performance').catch('performance'),
  t: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().catch(undefined),
  /** Blocks tab filters, sort and page */
  ...blockSearchShape,
  /** Blocks tab status; absent means canonical */
  status: z.enum(['orphaned', 'missed']).optional().catch(undefined),
});
