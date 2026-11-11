import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { fctHeadFirstSeenByNodeDailyServiceList } from '@/api/sdk.gen';
import type { FctHeadFirstSeenByNodeDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { fetchAllPages } from '@/utils/api-pagination';
import { completeBucketEnd } from '@/utils/time';
import { PAGE_SIZE } from '@/pages/ethereum/clients/constants';
import { windowStart } from '@/pages/ethereum/clients/utils/client-versions';
import { chunksFor, useKeepPrevious } from './useVersionCounts';

const NODE_VERSIONS_TABLE = 'fct_head_first_seen_by_node_daily';

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

function combine(
  results: Array<UseQueryResult<FctHeadFirstSeenByNodeDaily[]>>
): UseNodeVersionsResult & { /** Whether every chunk loaded */ settled: boolean } {
  return {
    rows: results.flatMap(result => result.data ?? []),
    isLoading: results.some(result => result.isLoading),
    settled: results.length > 0 && results.every(result => result.isSuccess),
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
  const now = useMemo(() => completeBucketEnd('day'), []);
  const to = span && span.to < now ? span.to : now;
  // Start no earlier than the table's data
  const bounds = useTableBounds(NODE_VERSIONS_TABLE);
  const dataStart = bounds.data?.min;
  const start = from === undefined ? dataStart : dataStart === undefined ? from : Math.max(from, dataStart);
  const chunks = useMemo(() => chunksFor('daily', start, to), [start, to]);

  const queried = useQueries({
    queries: chunks.map(chunk => ({
      queryKey: ['client-pages', 'node-versions', currentNetwork?.name, client, chunk.key],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (
          await fetchAllPages<FctHeadFirstSeenByNodeDaily>(
            fctHeadFirstSeenByNodeDailyServiceList,
            { query: { ...chunk.query, meta_consensus_implementation_eq: client, page_size: PAGE_SIZE } },
            NODE_VERSIONS_TABLE,
            signal
          )
        ).map(compact),
      enabled: !!currentNetwork && !!client && enabled && !bounds.isLoading,
      staleTime: chunk.open ? 30 * 60 * 1000 : Infinity,
    })),
    combine,
  });
  const result = useKeepPrevious(queried);

  // Year chunks overrun a window; trim them to it
  const firstDay = from === undefined ? undefined : new Date(from * 1000).toISOString().slice(0, 10);
  const rows = useMemo(
    () => (firstDay ? result.rows.filter(row => (row.day_start_date ?? '') >= firstDay) : result.rows),
    [result.rows, firstDay]
  );
  return { rows, isLoading: result.isLoading || (enabled && bounds.isLoading), error: result.error };
}
