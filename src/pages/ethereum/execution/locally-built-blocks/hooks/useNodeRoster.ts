import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctPreparedBlockByNodeDailyServiceList } from '@/api/sdk.gen';
import type { FctPreparedBlockByNodeDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { toUtcDate } from '@/utils/time';
import { parseExecutionClient } from '@/pages/ethereum/execution/locally-built-blocks/utils';
import { nodeIdOf } from '@/pages/ethereum/execution/locally-built-blocks/utils/block-query';

/** Past this many days the roster reads every day and keeps the window's in memory, instead of listing them */
const MAX_LISTED_DAYS = 31;

const DAY = 86400;

export interface NodeRoster {
  /** Node ids, sorted */
  nodes: string[];
  consensusClients: string[];
  executionClients: string[];
}

/**
 * Nodes that built blocks in the UTC days a window touches, with their consensus and execution clients, for filter
 * options.
 *
 * @param start - Window start (unix seconds); genesis for all history
 * @param end - Window end (unix seconds), now when unset
 */
export function useNodeRoster(start: number, end?: number): NodeRoster {
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time ?? 0;
  const endSeconds = end ?? Date.now() / 1000;
  const firstDay = toUtcDate(start);
  const lastDay = toUtcDate(endSeconds);
  const dayCount = Math.floor(endSeconds / DAY) - Math.floor(start / DAY) + 1;
  const dayFilter =
    start > genesisTime && dayCount <= MAX_LISTED_DAYS
      ? {
          day_start_date_in_values: Array.from({ length: dayCount }, (_, i) =>
            toUtcDate((Math.floor(start / DAY) + i) * DAY)
          ).join(','),
        }
      : null;

  const { data } = useQuery({
    queryKey: ['locally-built-blocks', 'roster', currentNetwork?.name, dayFilter],
    queryFn: ({ signal }) =>
      fetchAllPages<FctPreparedBlockByNodeDaily>(
        fctPreparedBlockByNodeDailyServiceList as Parameters<typeof fetchAllPages>[0],
        // Without a day list, every day since genesis: the API needs a filter on the first primary key column, the day
        { query: { ...(dayFilter ?? { day_start_date_ne: toUtcDate(genesisTime - DAY) }), page_size: 10000 } },
        'fct_prepared_block_by_node_daily',
        signal
      ),
    enabled: !!currentNetwork,
  });

  return useMemo(() => {
    const rows = (data ?? []).filter(
      row => !!row.day_start_date && row.day_start_date >= firstDay && row.day_start_date <= lastDay
    );
    const unique = (values: Array<string | null | undefined>): string[] =>
      [...new Set(values.filter((value): value is string => !!value))].sort();
    return {
      nodes: unique(rows.map(row => nodeIdOf(row.meta_client_name))),
      consensusClients: unique(rows.map(row => row.meta_consensus_implementation)),
      executionClients: unique(rows.map(row => parseExecutionClient(row.meta_client_name))),
    };
  }, [data, firstDay, lastDay]);
}
