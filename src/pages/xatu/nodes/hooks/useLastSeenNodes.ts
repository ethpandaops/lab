import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctNodeLastSeenServiceList } from '@/api/sdk.gen';
import type { FctNodeLastSeen } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import type { NodeRange } from '../constants';
import { getBuckets } from '../utils/time-buckets';

/** Rows from libp2p gossip name tysm sentries "prysm"; read them as tysm like the rollups and every other page */
function tysmClient(node: FctNodeLastSeen): FctNodeLastSeen {
  return node.meta_client_implementation === 'tysm' ? { ...node, meta_consensus_implementation: 'tysm' } : node;
}

export interface UseLastSeenNodesResult {
  nodes: FctNodeLastSeen[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Every Xatu node last seen inside the range, with its latest identity, client, location and last seen.
 *
 * The range starts at its first rollup bucket, so it covers the same Xatu nodes as the rollups.
 *
 * @param nodeId - Read one Xatu node only
 */
export function useLastSeenNodes(range: NodeRange, nodeId?: string): UseLastSeenNodesResult {
  const { currentNetwork } = useNetwork();
  // All history has no lower bound; otherwise the start moves once a bucket, keeping the key stable in between
  const start = range === 'all' ? undefined : getBuckets(range, Date.now() / 1000)[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ['xatu-nodes', 'last-seen', currentNetwork?.name, range, nodeId, start],
    queryFn: async ({ signal }) =>
      (
        await fetchAllPages<FctNodeLastSeen>(
          fctNodeLastSeenServiceList,
          {
            query: {
              // The API requires a filter the primary key index can use; a LIKE doesn't count
              meta_client_name_ne: '',
              ...(start !== undefined ? { last_seen_date_time_gte: start } : {}),
              ...(nodeId ? { node_id_eq: nodeId } : {}),
              page_size: 10000,
            },
          },
          'fct_node_last_seen',
          signal
        )
      ).map(tysmClient),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  return { nodes: data ?? [], isLoading, error };
}
