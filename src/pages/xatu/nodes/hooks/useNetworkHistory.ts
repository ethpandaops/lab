import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctBlockFirstSeenByNetworkDailyServiceList,
  fctBlockFirstSeenByNetworkHourlyServiceList,
  fctBlockFirstSeenByNetworkWeeklyServiceList,
} from '@/api/sdk.gen';
import type { FctBlockFirstSeenByNetworkHourly } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { NODE_RANGE_CONFIG, type Granularity, type NodeRange } from '../constants';
import { bucketFilter, getBuckets, rowBucket, type BucketColumns } from '../utils/time-buckets';

type ListFn = Parameters<typeof fetchAllPages>[0];

const LIST: Record<Granularity, ListFn> = {
  hourly: fctBlockFirstSeenByNetworkHourlyServiceList as ListFn,
  daily: fctBlockFirstSeenByNetworkDailyServiceList as ListFn,
  weekly: fctBlockFirstSeenByNetworkWeeklyServiceList as ListFn,
};

/** Spread of Xatu node medians in one bucket */
export interface BucketSpread {
  p10: number | null;
  p50: number | null;
  p90: number | null;
  nodeCount: number;
}

export interface NetworkHistory {
  /** p10, median and p90 across Xatu nodes of each node's median block arrival, by bucket start */
  spread: Map<number, BucketSpread>;
  /** The median alone, by bucket start: the network's typical arrival, to tell when a node trailed it */
  medians: Map<number, number>;
}

const EMPTY: NetworkHistory = { spread: new Map(), medians: new Map() };

/**
 * Block arrival across every Xatu node per hour, day or week of a range, from the network rollups, so a page that
 * only needs the baseline doesn't read every node's rows.
 */
export function useNetworkHistory(range: NodeRange): { data: NetworkHistory | null; isLoading: boolean } {
  const { currentNetwork } = useNetwork();
  const { granularity } = NODE_RANGE_CONFIG[range];
  const buckets = getBuckets(range, Date.now() / 1000);

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'network-history', currentNetwork?.name, range, buckets[0]],
    queryFn: async ({ signal }) => {
      const rows = await fetchAllPages<FctBlockFirstSeenByNetworkHourly & BucketColumns>(
        LIST[granularity],
        { query: { ...bucketFilter(granularity, buckets, range === 'all'), page_size: 10000 } },
        `fct_block_first_seen_by_network_${granularity}`,
        signal
      );
      const history: NetworkHistory = { spread: new Map(), medians: new Map() };
      rows.forEach(row => {
        const start = rowBucket(row, granularity);
        if (start === null || row.p50_median_seen_slot_start_diff === undefined) return;
        history.spread.set(start, {
          p10: row.p10_median_seen_slot_start_diff ?? null,
          p50: row.p50_median_seen_slot_start_diff,
          p90: row.p90_median_seen_slot_start_diff ?? null,
          nodeCount: row.node_count ?? 0,
        });
        history.medians.set(start, row.p50_median_seen_slot_start_diff);
      });
      return history;
    },
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    // Overrides the app's retry-forever default, so a missing table settles to no baseline
    retry: 2,
  });

  return { data: data ?? (error ? EMPTY : null), isLoading: isLoading && !error };
}
