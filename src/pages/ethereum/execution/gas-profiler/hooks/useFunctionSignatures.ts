import { useQuery } from '@tanstack/react-query';
import { dimFunctionSignatureServiceList } from '@/api/sdk.gen';
import type { DimFunctionSignature } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';

export interface UseFunctionSignaturesOptions {
  /** Array of function selectors to look up (hex encoded with 0x prefix, e.g., "0xa9059cbb") */
  selectors: string[];
  /** Whether the query is enabled */
  enabled?: boolean;
}

export interface FunctionSignatureMap {
  /** Map of lowercase selector to function signature data */
  [selector: string]: DimFunctionSignature;
}

export interface UseFunctionSignaturesResult {
  /** Map of function selectors to their signature data */
  data: FunctionSignatureMap;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error if the query failed */
  error: Error | null;
}

/**
 * Hook to fetch function signature data for a list of selectors.
 * Returns a map of lowercase selectors to their signature data for efficient lookup.
 */
export function useFunctionSignatures({
  selectors,
  enabled = true,
}: UseFunctionSignaturesOptions): UseFunctionSignaturesResult {
  // Normalize and deduplicate selectors
  const uniqueSelectors = [...new Set(selectors.map(s => s.toLowerCase()).filter(Boolean))];

  const query = useQuery({
    queryKey: ['function-signatures', uniqueSelectors.sort().join(',')],
    queryFn: async ({ signal }) => {
      if (uniqueSelectors.length === 0) {
        return {};
      }

      // API accepts comma-separated values for the in_values filter
      const selectorsParam = uniqueSelectors.join(',');

      const signatures = await fetchAllPages<DimFunctionSignature>(
        dimFunctionSignatureServiceList,
        {
          query: {
            selector_in_values: selectorsParam,
            page_size: 10000,
          },
        },
        'dim_function_signature',
        signal
      );

      // Build a map for efficient lookup
      const signatureMap: FunctionSignatureMap = {};
      for (const sig of signatures) {
        if (sig.selector) {
          signatureMap[sig.selector.toLowerCase()] = sig;
        }
      }

      return signatureMap;
    },
    enabled: enabled && uniqueSelectors.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - function signatures don't change
  });

  return {
    data: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
