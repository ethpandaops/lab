import { z } from 'zod';

/**
 * Zod schema for payloads search parameters
 * Validates filtering and pagination state in URL
 */
export const payloadsSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().min(0).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  pageToken: z.string().optional(),

  // Sorting
  orderBy: z.string().optional(),

  // Time range filters (Unix timestamps)
  timeStart: z.coerce.number().optional(),
  timeEnd: z.coerce.number().optional(),

  // Duration filter (milliseconds)
  durationMin: z.coerce.number().optional(),

  // Block metrics filters
  gasUsedMin: z.coerce.number().optional(),
  txCountMin: z.coerce.number().optional(),

  // Status filter (VALID, INVALID, SYNCING, ACCEPTED, INVALID_BLOCK_HASH, ERROR)
  status: z.string().optional(),

  // Client filter
  elClient: z.string().optional(),

  // Block filters
  slot: z.coerce.number().optional(),
  blockNumber: z.coerce.number().optional(),

  // Node class filter (reference nodes = eip7870-block-builder)
  referenceNodes: z.coerce.boolean().optional(),

  // Block detail dialog (unique identifier)
  detailSlot: z.coerce.number().optional(),
  detailNodeName: z.string().optional(),

  // Live mode - streams new observations in real-time
  isLive: z.coerce.boolean().optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type PayloadsSearch = z.infer<typeof payloadsSearchSchema>;

/**
 * Filter values for the FilterPanel component
 * Represents the draft state before applying filters
 */
export interface FilterValues {
  timeStart?: number;
  timeEnd?: number;
  durationMin?: number;
  gasUsedMin?: number;
  txCountMin?: number;
  status?: string;
  elClient?: string;
  slot?: number;
  blockNumber?: number;
  referenceNodes?: boolean;
}

/**
 * Engine API status values
 */
export const ENGINE_STATUS_VALUES = ['VALID', 'INVALID', 'SYNCING', 'ERROR'] as const;

export type EngineStatus = (typeof ENGINE_STATUS_VALUES)[number];

/**
 * Default filter values
 */
export const DEFAULT_DURATION_MIN = 0; // No duration filter by default
export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_TIME_RANGE_HOURS = 6;

/**
 * Feature flags
 */
export const LIVE_MODE_ENABLED = false; // Disabled for now - can re-enable later
