import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { fctHeadFirstSeenByNodeDailyServiceList } from '@/api/sdk.gen';
import type { FctHeadFirstSeenByNodeDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '../constants';
import { windowStart } from '../utils/client-versions';
import { chunksFor } from './useVersionCounts';

export interface UseNodeVersionsResult {
  /** One row per Xatu node, day and consensus version the node ran that day */
  rows: FctHeadFirstSeenByNodeDaily[];
  isLoading: boolean;
  error: Error | null;
}

/** The fields node version counts read, so all history keeps little in memory */
function compact(row: FctHeadFirstSeenByNodeDaily): FctHeadFirstSeenByNodeDaily {
  return {
    node_id: row.node_id,
    username: row.username,
    day_start_date: row.day_start_date,
    meta_consensus_version: row.meta_consensus_version,
  };
}

function combine(results: Array<UseQueryResult<FctHeadFirstSeenByNodeDaily[]>>): UseNodeVersionsResult {
  return {
    rows: results.flatMap(result => result.data ?? []),
    isLoading: results.some(result => result.isLoading),
    error: (results.find(result => result.error)?.error as Error | undefined) ?? null,
  };
}

/**
 * Consensus versions Xatu nodes running the client reported each day over the last `days` UTC days, all history
 * when `days` is null, or the days of `span` when given. Every node that sees heads is in the daily head table, so
 * it lists the same nodes as the active node list, per day. Long windows load a query per calendar year, and past
 * years stay cached.
 */
export function useNodeVersions(
  client: string | undefined,
  days: number | null,
  enabled: boolean,
  span?: { from: number; to: number }
): UseNodeVersionsResult {
  const { currentNetwork } = useNetwork();
  const from = span ? span.from : days === null ? undefined : windowStart(days);
  // Ten-minute aligned so the chunks, and their cache keys, stay put while the page is open
  const now = useMemo(() => Math.ceil(Date.now() / 1000 / 600) * 600, []);
  const to = span && span.to < now ? span.to : now;
  const chunks = useMemo(() => chunksFor('daily', from, to), [from, to]);

  const result = useQueries({
    queries: chunks.map(chunk => ({
      queryKey: ['client-pages', 'node-versions', currentNetwork?.name, client, chunk.key],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (
          await fetchAllPages<FctHeadFirstSeenByNodeDaily>(
            fctHeadFirstSeenByNodeDailyServiceList,
            { query: { ...chunk.query, meta_consensus_implementation_eq: client, page_size: PAGE_SIZE } },
            'fct_head_first_seen_by_node_daily',
            signal
          )
        ).map(compact),
      enabled: !!currentNetwork && !!client && enabled,
      staleTime: chunk.open ? 30 * 60 * 1000 : Infinity,
    })),
    combine,
  });

  // Year chunks overrun a window; trim them to it
  const firstDay = from === undefined ? undefined : new Date(from * 1000).toISOString().slice(0, 10);
  const rows = useMemo(
    () => (firstDay ? result.rows.filter(row => (row.day_start_date ?? '') >= firstDay) : result.rows),
    [result.rows, firstDay]
  );
  return { rows, isLoading: result.isLoading, error: result.error };
}
