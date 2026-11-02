import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctHeadFirstSeenByNodeDailyServiceList } from '@/api/sdk.gen';
import type { FctHeadFirstSeenByNodeDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '../constants';
import { windowStart } from '../utils/client-versions';

const DAY = 86400;
const TABLE = 'fct_head_first_seen_by_node_daily';

export interface UseNodeVersionsResult {
  /** One row per Xatu node, day and consensus version the node ran that day */
  rows: FctHeadFirstSeenByNodeDaily[];
  /** Days read when the window was sampled, null when every day was read */
  sampledDays: number | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Up to `max` dates (YYYY-MM-DD) spread evenly from `from` to today, both ends included; every date when the window
 * has no more than `max` days.
 */
export function spreadDates(from: number, max: number, now: number = Date.now()): string[] {
  const today = Math.floor(now / 1000 / DAY) * DAY;
  const first = Math.floor(from / DAY) * DAY;
  const count = Math.floor((today - first) / DAY) + 1;
  const offsets =
    count <= max
      ? Array.from({ length: count }, (_, i) => i)
      : Array.from({ length: max }, (_, i) => Math.round((i * (count - 1)) / (max - 1)));
  return offsets.map(offset => new Date((first + offset * DAY) * 1000).toISOString().slice(0, 10));
}

/**
 * Consensus versions Xatu nodes running the client reported each day over the last `days` UTC days, or since the
 * table's first day when `days` is null. Every node that sees heads is in the daily head table, so it lists the same
 * nodes as the active node list, per day. Windows longer than `maxDays` read that many days spread across them.
 */
export function useNodeVersions(
  client: string | undefined,
  days: number | null,
  enabled: boolean,
  maxDays = Infinity
): UseNodeVersionsResult {
  const { currentNetwork } = useNetwork();
  const bounds = useTableBounds(TABLE);
  const from = days === null ? bounds.data?.min : windowStart(days);
  const dates = useMemo(() => (from === undefined ? [] : spreadDates(from, maxDays)), [from, maxDays]);
  const sampled = from !== undefined && dates.length < spreadDates(from, Infinity).length;

  const query = useQuery({
    queryKey: ['client-pages', 'node-versions', currentNetwork?.name, client, dates.join(',')],
    queryFn: ({ signal }) =>
      fetchAllPages<FctHeadFirstSeenByNodeDaily>(
        fctHeadFirstSeenByNodeDailyServiceList,
        {
          query: {
            day_start_date_in_values: dates.join(','),
            meta_consensus_implementation_eq: client,
            page_size: PAGE_SIZE,
          },
        },
        TABLE,
        signal
      ),
    enabled: !!currentNetwork && !!client && enabled && dates.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  return {
    rows: query.data ?? [],
    sampledDays: sampled ? dates.length : null,
    isLoading: enabled && (query.isLoading || bounds.isLoading),
    error: query.error,
  };
}
