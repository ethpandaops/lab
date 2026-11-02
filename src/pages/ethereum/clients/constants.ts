export { UNKNOWN_CLIENT, GRAFFITI_FORMAT_LABELS } from '@/utils/graffiti';
import { z } from 'zod';

/** Available time period options for the client share charts */
export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/** Zod schema for the proposer clients page search params */
export const clientsSearchSchema = z.object({
  /** Time period */
  t: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']).optional(),
  /** Consensus client filter */
  cl: z.string().optional(),
  /** Execution client filter */
  el: z.string().optional(),
  /** Proposer entity filter */
  entity: z.string().optional(),
  /** Show shares of identified blocks only */
  identified: z.boolean().optional(),
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
export const DEFAULT_TIME_PERIOD: TimePeriod = '7d';

/** Page size for the aggregate queries */
export const PAGE_SIZE = 10_000;

/** Page size for the blocks table */
export const BLOCKS_PAGE_SIZE = 25;

/** Validator status whose per-entity counts list the entities to filter by */
export const ENTITY_OPTIONS_STATUS = 'active_ongoing';

/** Table that holds one row per block, used for bounds and the blocks table */
export const BLOCK_GRAFFITI_TABLE = 'fct_block_graffiti';

/** Windows of per-block graffiti the version views load; each day is a few thousand blocks per client */
export type VersionWindow = '7d' | '14d' | '30d' | '60d';

/** Days in each version window */
export const VERSION_WINDOW_DAYS: Record<VersionWindow, number> = { '7d': 7, '14d': 14, '30d': 30, '60d': 60 };

/** Version window options on the client page */
export const CLIENT_WINDOW_OPTIONS: ReadonlyArray<{ value: VersionWindow; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '14d', label: '14d' },
  { value: '30d', label: '30d' },
];

/** Version window options on the version page, longer so adoption since release fits */
export const VERSION_WINDOW_OPTIONS: ReadonlyArray<{ value: VersionWindow; label: string }> = [
  { value: '14d', label: '14d' },
  { value: '30d', label: '30d' },
  { value: '60d', label: '60d' },
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
  w: z.enum(['7d', '14d', '30d']).optional(),
  /** Fork whose minimum client version to check readiness against */
  fork: z.string().optional(),
});
export type ClientSearch = z.infer<typeof clientSearchSchema>;

/** Zod schema for the version page search params */
export const versionSearchSchema = z.object({
  /** Window of blocks adoption is measured over */
  w: z.enum(['14d', '30d', '60d']).optional(),
  /** Fork whose minimum client version to check readiness against */
  fork: z.string().optional(),
});
export type VersionSearch = z.infer<typeof versionSearchSchema>;

/** node_class of the EIP-7870 reference nodes in the engine and opcode tables */
export const REFERENCE_NODE_CLASS = 'eip7870-block-builder';

/** Days of reference node engine data the execution views load */
export const REFERENCE_DAYS = 90;
