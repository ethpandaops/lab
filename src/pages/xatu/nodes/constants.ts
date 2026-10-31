import { z } from 'zod';
import type { ArrivalTier } from './utils/node-stats';

/** Slots in the network-wide window every node is ranked over (two epochs) */
export const NETWORK_WINDOW_SLOTS = 64;

/** Windows refresh on this slot boundary so queries stay cached between slots */
export const WINDOW_STEP_SLOTS = 5;

/** A node that reported within this many seconds counts as online */
export const ONLINE_THRESHOLD_SECONDS = 15 * 60;

/** Time ranges for the history charts */
export type NodeRange = '24h' | '7d' | '30d' | '90d' | 'all';

export type Granularity = 'hourly' | 'daily';

/** Hourly rollups up to a week, daily beyond; `buckets` is null for all history */
export const NODE_RANGE_CONFIG: Record<NodeRange, { granularity: Granularity; buckets: number | null; label: string }> =
  {
    '24h': { granularity: 'hourly', buckets: 24, label: 'Last 24h' },
    '7d': { granularity: 'hourly', buckets: 168, label: 'Last 7 days' },
    '30d': { granularity: 'daily', buckets: 30, label: 'Last 30 days' },
    '90d': { granularity: 'daily', buckets: 90, label: 'Last 90 days' },
    all: { granularity: 'daily', buckets: null, label: 'All time' },
  };

export const DEFAULT_NODE_RANGE: NodeRange = '7d';

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

/**
 * How far a node's median arrival can trail the network's median before the node counts as behind: one slot.
 * Measured against the network, not slot start, so a chain-wide delay never marks every node as behind.
 */
export const BEHIND_MS = 12_000;

/** Slots in an hour and a day, for counting the slots a node missed */
export const SLOTS_PER_BUCKET: Record<Granularity, number> = { hourly: 300, daily: 7200 };

/** Number of columns a data column sidecar can carry (PeerDAS) */
export const DATA_COLUMN_COUNT = 128;

/** Tailwind fill of each arrival tier, from the shared performance gradient */
export const ARRIVAL_TIER_CLASSES: Record<ArrivalTier, string> = {
  excellent: 'bg-performance-excellent',
  good: 'bg-performance-good',
  fair: 'bg-performance-fair',
  slow: 'bg-performance-slow',
  poor: 'bg-performance-poor',
};
