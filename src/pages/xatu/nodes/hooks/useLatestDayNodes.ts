import { useQuery } from '@tanstack/react-query';
import {
  fctAttestationObservationByNodeDailyServiceList,
  fctBlockFirstSeenByNodeDailyServiceList,
} from '@/api/sdk.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

export interface UseLatestDayNodesResult {
  /** The latest complete UTC day, YYYY-MM-DD */
  day: string;
  /** Xatu node IDs with a block or attestation rollup row on that day */
  count: number | null;
  isLoading: boolean;
}

/**
 * Xatu nodes that reported on the latest complete UTC day. Node IDs of hashed nodes rotate, so counting IDs over a
 * longer range counts one node many times.
 */
export function useLatestDayNodes(): UseLatestDayNodesResult {
  const { currentNetwork } = useNetwork();
  const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['xatu-nodes', 'latest-day', currentNetwork?.name, day],
    queryFn: async ({ signal }) => {
      const query = { query: { day_start_date_eq: day, page_size: 10000 } };
      const [block, attestation] = await Promise.all([
        fetchAllPages<{ node_id?: string }>(
          fctBlockFirstSeenByNodeDailyServiceList,
          query,
          'fct_block_first_seen_by_node_daily',
          signal
        ),
        fetchAllPages<{ node_id?: string }>(
          fctAttestationObservationByNodeDailyServiceList,
          query,
          'fct_attestation_observation_by_node_daily',
          signal
        ),
      ]);
      return new Set([...block, ...attestation].map(row => row.node_id).filter(Boolean)).size;
    },
    enabled: !!currentNetwork,
  });

  return { day, count: data ?? null, isLoading };
}
