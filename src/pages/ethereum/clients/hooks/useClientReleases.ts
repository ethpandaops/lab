import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dimClientReleaseServiceList } from '@/api/sdk.gen';
import type { DimClientRelease } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS } from '@/utils/ethereum';
import { PAGE_SIZE } from '@/pages/ethereum/clients/constants';
import { latestRelease, sortReleases } from '@/pages/ethereum/clients/utils/client-versions';

export interface UseClientReleasesResult {
  /** Every release of the client, newest first */
  releases: DimClientRelease[];
  /** Newest full release */
  latest?: DimClientRelease;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Every published release of one client from dim_client_release.
 */
export function useClientReleases(client: string | undefined): UseClientReleasesResult {
  const query = useQuery({
    queryKey: ['client-pages', 'releases', client],
    queryFn: ({ signal }) =>
      fetchAllPages<DimClientRelease>(
        dimClientReleaseServiceList,
        { query: { client_eq: client, page_size: PAGE_SIZE } },
        'dim_client_release',
        signal
      ),
    enabled: !!client,
    staleTime: 30 * 60 * 1000,
  });

  const releases = useMemo(() => sortReleases(query.data ?? []), [query.data]);
  return { releases, latest: latestRelease(releases), isLoading: query.isLoading, error: query.error };
}

/**
 * Newest full release of every known client, keyed by client.
 */
export function useLatestReleases(): {
  latest: Map<string, DimClientRelease>;
  /** Full releases per client */
  releases: Map<string, DimClientRelease[]>;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['client-pages', 'latest-releases'],
    queryFn: ({ signal }) =>
      fetchAllPages<DimClientRelease>(
        dimClientReleaseServiceList,
        {
          query: {
            client_in_values: [...CONSENSUS_CLIENTS, ...EXECUTION_CLIENTS].join(','),
            prerelease_eq: false,
            page_size: PAGE_SIZE,
          },
        },
        'dim_client_release',
        signal
      ),
    staleTime: 30 * 60 * 1000,
  });

  const { latest, releases } = useMemo(() => {
    const byClient = new Map<string, DimClientRelease[]>();
    for (const release of query.data ?? []) {
      if (!release.client) continue;
      byClient.set(release.client, [...(byClient.get(release.client) ?? []), release]);
    }
    const newestByClient = new Map<string, DimClientRelease>();
    for (const [client, clientReleases] of byClient) {
      const newest = latestRelease(clientReleases);
      if (newest) newestByClient.set(client, newest);
    }
    return { latest: newestByClient, releases: byClient };
  }, [query.data]);

  return { latest, releases, isLoading: query.isLoading };
}
