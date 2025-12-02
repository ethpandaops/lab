import { z } from 'zod';

/**
 * View mode for data availability visualization
 * - 'percentage': Traditional success rate (successCount / totalCount)
 * - 'threshold': Count-based view showing if successCount meets threshold
 */
export type ViewMode = 'percentage' | 'threshold';

/**
 * Default observation thresholds by network
 * Mainnet has more validators/observers, so needs higher threshold
 * Testnets use lower threshold due to less traffic
 */
export const DEFAULT_THRESHOLDS: Record<string, number> = {
  mainnet: 30,
  default: 3,
};

/**
 * Get default threshold for a network
 */
export function getDefaultThreshold(networkName: string | undefined): number {
  if (!networkName) return DEFAULT_THRESHOLDS.default;
  return DEFAULT_THRESHOLDS[networkName] ?? DEFAULT_THRESHOLDS.default;
}

/**
 * Zod schema for custody search parameters
 * Validates hierarchical drill-down state in URL
 */
export const custodySearchSchema = z.object({
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

  // View mode: 'percentage' (default) or 'threshold'
  mode: z.enum(['percentage', 'threshold']).optional(),

  // Custom threshold for threshold mode (overrides network default)
  threshold: z.coerce.number().min(1).optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type CustodySearch = z.infer<typeof custodySearchSchema>;

/**
 * Validates hierarchical consistency of search params
 * @param search - Search params to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateSearchParamHierarchy(search: CustodySearch): string | undefined {
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
