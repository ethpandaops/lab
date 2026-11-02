import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 25;

const optionalCount = z.coerce.number().int().nonnegative().optional().catch(undefined);
const optionalPercent = z.coerce.number().min(0).max(100).optional().catch(undefined);

/**
 * Search params for the epochs list. Filters and the page position live here so a view can be shared by URL.
 */
export const epochsSearchSchema = z.object({
  /** Page index, for display; the cursor says where the page starts */
  page: z.coerce.number().int().nonnegative().optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
  /** `lt:<epoch>` or `gt:<epoch>` */
  cursor: z.string().optional().catch(undefined),

  epochMin: optionalCount,
  epochMax: optionalCount,
  /** Unix seconds */
  timeStart: optionalCount,
  timeEnd: optionalCount,
  /** Attestation participation, percent */
  participationMin: optionalPercent,
  participationMax: optionalPercent,
  /** Missed slots in the epoch */
  missedMin: optionalCount,
  missedMax: optionalCount,
});

export type EpochsSearch = z.infer<typeof epochsSearchSchema>;

export type EpochFilters = Omit<EpochsSearch, 'page' | 'pageSize' | 'cursor'>;

export const EPOCH_FILTER_KEYS = [
  'epochMin',
  'epochMax',
  'timeStart',
  'timeEnd',
  'participationMin',
  'participationMax',
  'missedMin',
  'missedMax',
] as const satisfies ReadonlyArray<keyof EpochFilters>;
