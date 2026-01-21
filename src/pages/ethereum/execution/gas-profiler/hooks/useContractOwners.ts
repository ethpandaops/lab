import { useQuery } from '@tanstack/react-query';
import { dimContractOwnerServiceList } from '@/api/sdk.gen';
import type { DimContractOwner } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';

export interface UseContractOwnersOptions {
  /** Array of contract addresses to look up (hex encoded with 0x prefix) */
  addresses: string[];
  /** Whether the query is enabled */
  enabled?: boolean;
}

export interface ContractOwnerMap {
  /** Map of lowercase contract address to contract owner data */
  [address: string]: DimContractOwner;
}

export interface UseContractOwnersResult {
  /** Map of contract addresses to their owner data */
  data: ContractOwnerMap;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error if the query failed */
  error: Error | null;
}

/**
 * Hook to fetch contract owner data for a list of addresses.
 * Returns a map of lowercase addresses to their owner data for efficient lookup.
 */
export function useContractOwners({ addresses, enabled = true }: UseContractOwnersOptions): UseContractOwnersResult {
  // Normalize and deduplicate addresses
  const uniqueAddresses = [...new Set(addresses.map(a => a.toLowerCase()).filter(Boolean))];

  const query = useQuery({
    queryKey: ['contract-owners', uniqueAddresses.sort().join(',')],
    queryFn: async ({ signal }) => {
      if (uniqueAddresses.length === 0) {
        return {};
      }

      // API accepts comma-separated values for the in_values filter
      const addressesParam = uniqueAddresses.join(',');

      const owners = await fetchAllPages<DimContractOwner>(
        dimContractOwnerServiceList,
        {
          query: {
            contract_address_in_values: addressesParam,
            page_size: 10000,
          },
        },
        'dim_contract_owner',
        signal
      );

      // Build a map for efficient lookup
      const ownerMap: ContractOwnerMap = {};
      for (const owner of owners) {
        if (owner.contract_address) {
          ownerMap[owner.contract_address.toLowerCase()] = owner;
        }
      }

      return ownerMap;
    },
    enabled: enabled && uniqueAddresses.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - contract owners don't change often
  });

  return {
    data: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
