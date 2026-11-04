import { useQuery } from '@tanstack/react-query';
import { intAttestationAttestedHeadServiceList, intAttestationAttestedServiceList } from '@/api/sdk.gen';
import type { IntAttestationAttested } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

export interface UseAllAttestationVotesResult {
  data: IntAttestationAttested[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch ALL attestation votes for a slot, following every page.
 * A response without rows or without a next page token ends the fetch.
 *
 * @param slotTimestamp - The slot timestamp to fetch attestations for
 * @param settled - Read the settled table; false reads its head counterpart
 * @param enabled - Whether the query should run
 * @returns Object containing all attestation data, loading state, and error state
 */
export function useAllAttestationVotes(
  slotTimestamp: number,
  settled: boolean,
  enabled: boolean
): UseAllAttestationVotesResult {
  const { currentNetwork } = useNetwork();
  const table = settled ? 'int_attestation_attested' : 'int_attestation_attested_head';

  const { data, isLoading, error } = useQuery({
    queryKey: ['attestation-votes-all', currentNetwork?.name, table, slotTimestamp],
    queryFn: ({ signal }) =>
      fetchAllPages<IntAttestationAttested>(
        settled ? intAttestationAttestedServiceList : intAttestationAttestedHeadServiceList,
        { query: { slot_start_date_time_eq: slotTimestamp, page_size: 10000 } },
        table,
        signal
      ),
    enabled,
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
