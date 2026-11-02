import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { fctBlockGraffitiServiceList } from '@/api/sdk.gen';
import type { DimClientRelease, FctBlockGraffiti } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '../constants';
import type { ClientLayer } from '../utils/client-share';
import { resolveBlocks, type ResolvedBlock } from '../utils/client-versions';

const DAY = 86400;

export interface UseClientBlocksResult {
  /** Blocks whose graffiti names the client, oldest first, with the client's release resolved */
  blocks: ResolvedBlock[];
  /** Start of the window (unix seconds, UTC midnight) */
  since: number;
  /** Days loaded so far, of `days` */
  loadedDays: number;
  isLoading: boolean;
  error: Error | null;
}

/** Joins the per-day queries; module scoped so React Query only re-runs it when a day changes */
function combineDays(results: Array<UseQueryResult<FctBlockGraffiti[]>>): {
  rows: FctBlockGraffiti[];
  loadedDays: number;
  isLoading: boolean;
  error: Error | null;
} {
  return {
    rows: results.flatMap(result => result.data ?? []),
    loadedDays: results.filter(result => result.data).length,
    isLoading: results.some(result => result.isLoading),
    error: (results.find(result => result.error)?.error as Error | undefined) ?? null,
  };
}

/** The graffiti fields version resolution reads, so a long window keeps little in memory */
function compact(row: FctBlockGraffiti): FctBlockGraffiti {
  return {
    slot: row.slot,
    slot_start_date_time: row.slot_start_date_time,
    entity: row.entity,
    consensus_client: row.consensus_client,
    consensus_client_version: row.consensus_client_version,
    consensus_client_commit: row.consensus_client_commit,
    execution_client: row.execution_client,
    execution_client_commit: row.execution_client_commit,
  };
}

/**
 * Every block over the last `days` UTC days whose graffiti names the client, with its release resolved against
 * `releases`. Each day loads as its own query, in parallel, and finished days stay cached, so changing the window
 * only loads the days it adds.
 */
export function useClientBlocks(
  client: string | undefined,
  layer: ClientLayer | null,
  days: number,
  releases: DimClientRelease[]
): UseClientBlocksResult {
  const { currentNetwork } = useNetwork();
  const today = useMemo(() => Math.floor(Date.now() / 1000 / DAY) * DAY, []);
  const dayStarts = useMemo(() => Array.from({ length: days }, (_, i) => today - (days - 1 - i) * DAY), [days, today]);

  const results = useQueries({
    queries: dayStarts.map(start => ({
      queryKey: ['client-pages', 'blocks-day', currentNetwork?.name, client, layer, start],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (
          await fetchAllPages<FctBlockGraffiti>(
            fctBlockGraffitiServiceList,
            {
              query: {
                ...(layer === 'consensus' ? { consensus_client_eq: client } : { execution_client_eq: client }),
                slot_start_date_time_gte: start,
                slot_start_date_time_lt: start + DAY,
                order_by: 'slot_start_date_time asc',
                page_size: PAGE_SIZE,
              },
            },
            'fct_block_graffiti',
            signal
          )
        ).map(compact),
      enabled: !!currentNetwork && !!client && !!layer,
      // Past days are final; today keeps filling
      staleTime: start === today ? 5 * 60 * 1000 : Infinity,
    })),
    combine: combineDays,
  });

  const { rows, loadedDays, isLoading, error } = results;
  const blocks = useMemo(() => (layer ? resolveBlocks(rows, layer, releases) : []), [rows, layer, releases]);

  return { blocks, since: dayStarts[0], loadedDays, isLoading, error };
}
