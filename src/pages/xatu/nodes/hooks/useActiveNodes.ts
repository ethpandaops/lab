import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeActiveLast24h, FctNodeActiveLast24hServiceListResponse } from '@/api/types.gen';

/** Client name prefixes of public, corporate and ethPandaOps nodes; the table needs one to list nodes */
const CLIENT_NAME_PREFIXES = ['pub-', 'corp-', 'ethpandaops'] as const;

export interface UseActiveNodesResult {
  nodes: FctNodeActiveLast24h[];
  isLoading: boolean;
  error: Error | null;
}

function combine(results: UseQueryResult<FctNodeActiveLast24hServiceListResponse, unknown>[]): UseActiveNodesResult {
  // A node that changed its privacy setting reports under two client names; keep its latest row
  const byNodeId = new Map<string, FctNodeActiveLast24h>();
  results
    .flatMap(result => result.data?.fct_node_active_last_24h ?? [])
    .forEach(node => {
      const key = node.node_id ?? node.meta_client_name ?? '';
      const current = byNodeId.get(key);
      if (!current || (node.last_seen_date_time ?? 0) > (current.last_seen_date_time ?? 0)) byNodeId.set(key, node);
    });

  return {
    nodes: [...byNodeId.values()],
    isLoading: results.some(result => result.isLoading),
    error: (results.find(result => result.error)?.error as Error | undefined) ?? null,
  };
}

/**
 * Every node that reported to Xatu in the last 24 hours.
 *
 * Uses the same queries as the contributors page so both share the cache.
 */
export function useActiveNodes(): UseActiveNodesResult {
  return useQueries({
    queries: CLIENT_NAME_PREFIXES.map(prefix =>
      fctNodeActiveLast24hServiceListOptions({
        query: { meta_client_name_starts_with: prefix, page_size: 1000 },
      })
    ),
    combine,
  });
}
