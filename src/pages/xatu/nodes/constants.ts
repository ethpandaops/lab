import { z } from 'zod';

/** Slots in the network-wide window every node is ranked over (two epochs) */
export const NETWORK_WINDOW_SLOTS = 64;

/** Windows refresh on this slot boundary so queries stay cached between slots */
export const WINDOW_STEP_SLOTS = 5;

/** A node that reported within this many seconds counts as online */
export const ONLINE_THRESHOLD_SECONDS = 15 * 60;

/** Time ranges for the history charts */
export type NodeRange = '24h' | '7d' | '30d' | '90d' | 'all';

export type Granularity = 'hourly' | 'daily' | 'weekly';

/** Hourly rollups up to a week, daily up to 90 days, weekly for all history, where `buckets` is null */
export const NODE_RANGE_CONFIG: Record<NodeRange, { granularity: Granularity; buckets: number | null; label: string }> =
  {
    '24h': { granularity: 'hourly', buckets: 24, label: 'Last 24h' },
    '7d': { granularity: 'hourly', buckets: 168, label: 'Last 7 days' },
    '30d': { granularity: 'daily', buckets: 30, label: 'Last 30 days' },
    '90d': { granularity: 'daily', buckets: 90, label: 'Last 90 days' },
    all: { granularity: 'weekly', buckets: null, label: 'All time' },
  };

export const DEFAULT_NODE_RANGE: NodeRange = 'all';

export const NODE_RANGE_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
] as const;

const rangeSchema = z.enum(['24h', '7d', '30d', '90d', 'all']).optional();

export const nodeDetailSearchSchema = z.object({ range: rangeSchema });

export const nodesSearchSchema = z.object({ range: rangeSchema });

/** `seen` scopes a contributor's Xatu nodes; `range` scopes their observation timings */
export const contributorSearchSchema = z.object({ range: rangeSchema, seen: rangeSchema });

/**
 * How far a node's median arrival can trail the network's median before the node counts as behind: one slot.
 * Measured against the network, not slot start, so a chain-wide delay never marks every node as behind.
 */
export const BEHIND_MS = 12_000;

/** Slots in an hour, a day and a week, for counting the slots a node missed */
export const SLOTS_PER_BUCKET: Record<Granularity, number> = { hourly: 300, daily: 7200, weekly: 50400 };

/** Number of columns a data column sidecar can carry (PeerDAS) */
export const DATA_COLUMN_COUNT = 128;
