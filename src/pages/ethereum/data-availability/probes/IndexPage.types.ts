import { z } from 'zod';

/**
 * Zod schema for probes search parameters
 * Validates filtering and pagination state in URL
 */
export const probesSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),

  // Slot and epoch filters
  slot: z.coerce.number().optional(),
  epoch: z.coerce.number().optional(),

  // Column index selection (0-127)
  column: z.coerce.number().min(0).max(127).optional(),

  // Result filter (success/failure/missing)
  result: z.string().optional(),

  // Client implementation filter
  client: z.string().optional(),

  // Country filter
  country: z.string().optional(),

  // Sorting
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ProbesSearch = z.infer<typeof probesSearchSchema>;
