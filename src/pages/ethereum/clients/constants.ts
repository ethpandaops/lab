export { UNKNOWN_CLIENT, GRAFFITI_FORMAT_LABELS } from '@/utils/graffiti';
import { z } from 'zod';
import { blockSearchShape } from './utils/block-filters';

/** Available time period options for the client share charts */
export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/** Zod schema for the proposer clients page search params */
export const clientsSearchSchema = z.object({
  /** Filters for the whole page; same params as the block tables */
  cl: blockSearchShape.cl,
  el: blockSearchShape.el,
  entity: blockSearchShape.entity,
  /** Time period */
  t: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).optional(),
});
export type ClientsSearch = z.infer<typeof clientsSearchSchema>;

/** Configuration for each time period: hourly data for short windows, daily for long ones */
export const TIME_RANGE_CONFIG = {
  '24h': { days: 1, dataType: 'hourly' as const },
  '7d': { days: 7, dataType: 'hourly' as const },
  '30d': { days: 30, dataType: 'daily' as const },
  '90d': { days: 90, dataType: 'daily' as const },
  '1y': { days: 365, dataType: 'daily' as const },
  all: { days: null, dataType: 'daily' as const },
} as const;

/** Time period selector options for UI rendering */
export const TIME_PERIOD_OPTIONS: ReadonlyArray<{ value: TimePeriod; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

/** Default time period */
export const DEFAULT_TIME_PERIOD: TimePeriod = 'all';

/** Page size for the aggregate queries */
export const PAGE_SIZE = 10_000;

/** Validator status whose per-entity counts list the entities to filter by */
export const ENTITY_OPTIONS_STATUS = 'active_ongoing';

/** Table that holds one row per block, used for bounds and the blocks table */
export const BLOCK_GRAFFITI_TABLE = 'fct_block_graffiti';

/** Windows of per-block graffiti the version views load; each day is a few thousand blocks per client */
export type VersionWindow = '7d' | '14d' | '30d' | '60d' | '90d' | 'all';

/** Days in each version window; all history when null */
export const VERSION_WINDOW_DAYS: Record<VersionWindow, number | null> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '60d': 60,
  '90d': 90,
  all: null,
};

/** Version window options on the client page */
export const CLIENT_WINDOW_OPTIONS: ReadonlyArray<{ value: VersionWindow; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

/** Version window options on the version page, longer so adoption since release fits */
export const VERSION_WINDOW_OPTIONS: ReadonlyArray<{ value: VersionWindow; label: string }> = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

/** Share chart windows on the client page */
export type ShareWindow = '30d' | '90d' | '1y' | 'all';

/** Days in each share window; all history when null */
export const SHARE_WINDOW_DAYS: Record<ShareWindow, number | null> = { '30d': 30, '90d': 90, '1y': 365, all: null };

/** How each share window reads in copy */
export const SHARE_WINDOW_TEXT: Record<ShareWindow, string> = {
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
  all: 'all time',
};

/** Share chart window options on the client page */
export const SHARE_WINDOW_OPTIONS: ReadonlyArray<{ value: ShareWindow; label: string }> = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

/** Tabs of the client page */
export const CLIENT_TABS = [
  'overview',
  'versions',
  'proposers',
  'pairings',
  'network',
  'nodes',
  'performance',
  'releases',
] as const;
export type ClientTab = (typeof CLIENT_TABS)[number];

/** Zod schema for the client page search params */
export const clientSearchSchema = z.object({
  tab: z.enum(CLIENT_TABS).optional(),
  /** Window of blocks the version, proposer and pairing views use */
  w: z.enum(['7d', '14d', '30d', '90d', 'all']).optional().catch(undefined),
  /** Window of the share charts, which come from daily counts and reach back to genesis */
  t: z.enum(['30d', '90d', '1y', 'all']).optional().catch(undefined),
  /** Fork whose minimum client version to check readiness against */
  fork: z.string().optional(),
  /** Proposers tab blocks table filters, sort and page */
  ...blockSearchShape,
});
export type ClientSearch = z.infer<typeof clientSearchSchema>;

/** Zod schema for the version page search params */
export const versionSearchSchema = z.object({
  /** Window of blocks adoption is measured over */
  w: z.enum(['14d', '30d', '60d', '90d', 'all']).optional().catch(undefined),
  /** Fork whose minimum client version to check readiness against */
  fork: z.string().optional(),
});
export type VersionSearch = z.infer<typeof versionSearchSchema>;

/** node_class of the EIP-7870 reference nodes in the engine and opcode tables */
export const REFERENCE_NODE_CLASS = 'eip7870-block-builder';
