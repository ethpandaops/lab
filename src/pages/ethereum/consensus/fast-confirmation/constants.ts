import { z } from 'zod';

/** Zod schema for fast confirmation search params */
export const fastConfirmationSearchSchema = z.object({
  client: z.string().optional(),
  epoch: z.coerce.number().int().nonnegative().optional(),
});
export type FastConfirmationSearch = z.infer<typeof fastConfirmationSearchSchema>;

/** Page size for list queries */
export const PAGE_SIZE = 10_000;

/** Hours of per-block data fetched for the distribution */
export const RECENT_BLOCK_HOURS = 3;

/** A block fast confirmed later than this (ms after slot start) missed its own slot */
export const LATE_CONFIRMATION_MS = 13_000;

/** Late blocks within this many slots of each other belong to the same episode */
export const STALL_EPISODE_GAP_SLOTS = 32;
