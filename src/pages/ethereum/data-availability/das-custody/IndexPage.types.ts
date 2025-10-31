import { z } from 'zod';

/**
 * Zod schema for DAS custody search parameters
 * Validates hierarchical drill-down state in URL
 */
export const dasCustodySearchSchema = z.object({
  // Date string (YYYY-MM-DD) for day-level drill-down
  date: z.string().optional(),

  // Unix timestamp for hour-level drill-down
  hour: z.coerce.number().optional(),

  // Epoch number for epoch-level drill-down
  epoch: z.coerce.number().optional(),

  // Slot number for slot-level drill-down
  slot: z.coerce.number().optional(),

  // Column index selection (0-127)
  column: z.coerce.number().min(0).max(127).optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type DasCustodySearch = z.infer<typeof dasCustodySearchSchema>;

/**
 * Validates hierarchical consistency of search params
 * @param search - Search params to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateSearchParamHierarchy(search: DasCustodySearch): string | undefined {
  // Slot requires epoch
  if (search.slot !== undefined && search.epoch === undefined) {
    return 'Slot parameter requires epoch parameter';
  }

  // Epoch requires hour
  if (search.epoch !== undefined && search.hour === undefined) {
    return 'Epoch parameter requires hour parameter';
  }

  // Hour requires date
  if (search.hour !== undefined && search.date === undefined) {
    return 'Hour parameter requires date parameter';
  }

  return undefined;
}
