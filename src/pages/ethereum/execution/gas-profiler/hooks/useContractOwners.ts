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

/** Maximum addresses per batch to avoid URL length limits */
const BATCH_SIZE = 50;

/**
 * Splits an array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Hook to fetch contract owner data for a list of addresses.
 * Returns a map of lowercase addresses to their owner data for efficient lookup.
 * Automatically batches requests to avoid URL length limits.
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

      // Split addresses into batches to avoid URL length limits
      const batches = chunk(uniqueAddresses, BATCH_SIZE);
      const ownerMap: ContractOwnerMap = {};

      // Fetch all batches in parallel
      const batchResults = await Promise.all(
        batches.map(async batchAddresses => {
          const addressesParam = batchAddresses.join(',');
          return fetchAllPages<DimContractOwner>(
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
        })
      );

      // Combine results from all batches
      for (const owners of batchResults) {
        for (const owner of owners) {
          if (owner.contract_address) {
            ownerMap[owner.contract_address.toLowerCase()] = owner;
          }
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
