import { z } from 'zod';

/**
 * Zod schema for slow blocks search parameters
 * Validates filtering and pagination state in URL
 */
export const slowBlocksSearchSchema = z.object({
  // Pagination
  pageSize: z.coerce.number().min(1).max(100).optional(),
  pageToken: z.string().optional(),

  // Sorting
  orderBy: z.string().optional(),

  // Time range filters (Unix timestamps)
  timeStart: z.coerce.number().optional(),
  timeEnd: z.coerce.number().optional(),

  // Duration filters (milliseconds)
  durationMin: z.coerce.number().optional(),
  durationMax: z.coerce.number().optional(),

  // Status filter (VALID, INVALID, SYNCING, ACCEPTED, INVALID_BLOCK_HASH, ERROR)
  status: z.string().optional(),

  // Client filters
  elClient: z.string().optional(),
  clClient: z.string().optional(),
  nodeName: z.string().optional(),

  // Block filters
  blockStatus: z.string().optional(), // canonical, orphaned, unknown
  slot: z.coerce.number().optional(),

  // Block detail dialog (unique identifier)
  detailSlot: z.coerce.number().optional(),
  detailNodeName: z.string().optional(),

  // Live mode - streams new observations in real-time
  isLive: z.coerce.boolean().optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type SlowBlocksSearch = z.infer<typeof slowBlocksSearchSchema>;

/**
 * Filter values for the FilterPanel component
 * Represents the draft state before applying filters
 */
export interface FilterValues {
  timeStart?: number;
  timeEnd?: number;
  durationMin?: number;
  durationMax?: number;
  status?: string;
  elClient?: string;
  clClient?: string;
  nodeName?: string;
  blockStatus?: string;
  slot?: number;
}

/**
 * Engine API status values
 */
export const ENGINE_STATUS_VALUES = ['VALID', 'INVALID', 'SYNCING', 'ACCEPTED', 'INVALID_BLOCK_HASH', 'ERROR'] as const;

export type EngineStatus = (typeof ENGINE_STATUS_VALUES)[number];

/**
 * Block status values
 */
export const BLOCK_STATUS_VALUES = ['canonical', 'orphaned', 'unknown'] as const;

export type BlockStatus = (typeof BLOCK_STATUS_VALUES)[number];

/**
 * Default filter values
 */
export const DEFAULT_DURATION_MIN = 500; // 500ms threshold
export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_TIME_RANGE_HOURS = 1;
