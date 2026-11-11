import { z } from 'zod';

/**
 * Zod schema for payloads search parameters
 * Validates filtering and pagination state in URL
 */
export const payloadsSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().min(0).optional().catch(undefined),
  pageSize: z.coerce.number().min(1).max(100).optional().catch(undefined),
  pageToken: z.string().optional().catch(undefined),

  // Sorting
  orderBy: z.string().optional().catch(undefined),

  // Time range filters (Unix timestamps)
  timeStart: z.coerce.number().optional().catch(undefined),
  timeEnd: z.coerce.number().optional().catch(undefined),

  // Duration filter (milliseconds)
  durationMin: z.coerce.number().optional().catch(undefined),

  // Block metrics filters
  gasUsedMin: z.coerce.number().optional().catch(undefined),
  txCountMin: z.coerce.number().optional().catch(undefined),

  // Status filter (VALID, INVALID, SYNCING, ACCEPTED, INVALID_BLOCK_HASH, ERROR)
  status: z.string().optional().catch(undefined),

  // Client filter
  elClient: z.string().optional().catch(undefined),

  // Block filters
  slot: z.coerce.number().optional().catch(undefined),
  blockNumber: z.coerce.number().optional().catch(undefined),

  // Node class filter (reference nodes = eip7870-block-builder)
  referenceNodes: z.coerce.boolean().optional().catch(undefined),

  // Block detail dialog (unique identifier)
  detailSlot: z.coerce.number().optional().catch(undefined),
  detailNodeName: z.string().optional().catch(undefined),
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

/**
 * Default filter values
 */
export const DEFAULT_DURATION_MIN = 0; // No duration filter by default
export const DEFAULT_PAGE_SIZE = 25;

/** Order when the URL gives none: slowest observation first */
export const DEFAULT_ORDER = 'duration_ms desc';

/** Most days a ranking other than newest first reads, ending at the URL's range end or now */
export const RANKED_MAX_DAYS = 7;
