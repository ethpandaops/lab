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

/** Maximum selectors per batch to avoid URL length limits */
const BATCH_SIZE = 100;

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
 * Hook to fetch function signature data for a list of selectors.
 * Returns a map of lowercase selectors to their signature data for efficient lookup.
 * Automatically batches requests to avoid URL length limits.
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

      // Split selectors into batches to avoid URL length limits
      const batches = chunk(uniqueSelectors, BATCH_SIZE);
      const signatureMap: FunctionSignatureMap = {};

      // Fetch all batches in parallel
      const batchResults = await Promise.all(
        batches.map(async batchSelectors => {
          const selectorsParam = batchSelectors.join(',');
          return fetchAllPages<DimFunctionSignature>(
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
        })
      );

      // Combine results from all batches
      for (const signatures of batchResults) {
        for (const sig of signatures) {
          if (sig.selector) {
            signatureMap[sig.selector.toLowerCase()] = sig;
          }
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
