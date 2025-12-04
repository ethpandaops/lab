import { z } from 'zod';

/**
 * Zod schema for probes search parameters
 * Validates filtering and pagination state in URL
 */
export const probesSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  pageToken: z.string().optional(),

  // Sorting
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),

  // Result filter (success/failure/missing)
  result: z.string().optional(),

  // Client implementation filters
  prober: z.string().optional(),
  peer: z.string().optional(),

  // Peer ID filter (stored as string to preserve BigInt precision)
  peerId: z.coerce.string().optional(),

  // Node ID filter (prober node identifier)
  nodeId: z.string().optional(),

  // Country filters
  proberCountry: z.string().optional(),
  peerCountry: z.string().optional(),

  // City filters
  proberCity: z.string().optional(),
  peerCity: z.string().optional(),

  // Version filters
  proberVersion: z.string().optional(),
  peerVersion: z.string().optional(),

  // ASN filters
  proberAsn: z.coerce.number().optional(),
  peerAsn: z.coerce.number().optional(),

  // Slot filter (filter by individual slot)
  slot: z.coerce.number().optional(),

  // Column filter (filter by individual column index)
  column: z.coerce.number().optional(),

  // Blob poster filter (filter by blob submitter names - multiselect)
  blobPosters: z.array(z.string()).optional(),

  // Time range filters (Unix timestamps) - for linking from custody drill-down
  timeStart: z.coerce.number().optional(),
  timeEnd: z.coerce.number().optional(),

  // Probe detail dialog - unique identifier is probe_date_time + peer_id_unique_key
  // probePeerId is a string to preserve Int64 precision (JavaScript Number loses precision)
  probeTime: z.coerce.number().optional(),
  probePeerId: z.string().optional(),

  // Live mode - streams new probes in real-time
  isLive: z.coerce.boolean().optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ProbesSearch = z.infer<typeof probesSearchSchema>;
