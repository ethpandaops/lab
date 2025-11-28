import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intAttestationAttestedHeadServiceList } from '@/api/sdk.gen';
import type { IntAttestationAttestedHead } from '@/api/types.gen';

export interface UseAllAttestationVotesResult {
  data: IntAttestationAttestedHead[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch ALL attestation votes for a slot, handling pagination automatically.
 * Keeps fetching pages until there are no more results.
 *
 * @param slotTimestamp - The slot timestamp to fetch attestations for
 * @param enabled - Whether the query should run
 * @returns Object containing all attestation data, loading state, and error state
 */
export function useAllAttestationVotes(slotTimestamp: number, enabled: boolean): UseAllAttestationVotesResult {
  const [allData, setAllData] = useState<IntAttestationAttestedHead[]>([]);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  // Reset state when slot changes
  useEffect(() => {
    setAllData([]);
    setPageToken(undefined);
    setHasMore(true);
    setIsComplete(false);
  }, [slotTimestamp]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['attestation-votes-all', slotTimestamp, pageToken],
    queryFn: async () => {
      const response = await intAttestationAttestedHeadServiceList({
        query: {
          slot_start_date_time_eq: slotTimestamp,
          page_size: 10000,
          page_token: pageToken,
        },
      });
      return response;
    },
    enabled: enabled && hasMore && !isComplete,
  });

  // Process fetched data
  useEffect(() => {
    if (data?.data?.int_attestation_attested_head && Array.isArray(data.data.int_attestation_attested_head)) {
      setAllData(prev => [...prev, ...data.data.int_attestation_attested_head!]);

      if (data.data.next_page_token) {
        // More pages available
        setPageToken(data.data.next_page_token);
      } else {
        // No more pages
        setHasMore(false);
        setIsComplete(true);
      }
    }
  }, [data]);

  return {
    data: allData,
    isLoading: isLoading || (hasMore && !isComplete),
    error: error as Error | null,
  };
}
