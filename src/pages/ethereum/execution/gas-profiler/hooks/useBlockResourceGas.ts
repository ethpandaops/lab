import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intBlockResourceGasServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntBlockResourceGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { toResourceEntries, getResourceRefund, getTotalResourceGas } from '../utils/resourceGas';
import type { ResourceGasEntry } from '../utils/resourceGas';

export interface UseBlockResourceGasOptions {
  blockNumber: number | null;
}

export interface UseBlockResourceGasResult {
  /** Resource breakdown entries sorted by gas desc */
  entries: ResourceGasEntry[];
  /** Raw API record */
  record: IntBlockResourceGas | null;
  /** Gas refund value */
  refund: number;
  /** Total resource gas (sum of 7 categories) */
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch block-level resource gas breakdown.
 * Uses the `int_block_resource_gas` API endpoint.
 */
export function useBlockResourceGas({ blockNumber }: UseBlockResourceGasOptions): UseBlockResourceGasResult {
  const { currentNetwork } = useNetwork();

  const enabled = !!currentNetwork && blockNumber !== null && !isNaN(blockNumber);

  const { data, isLoading, error } = useQuery({
    ...intBlockResourceGasServiceListOptions({
      query: {
        block_number_eq: blockNumber!,
        page_size: 1,
      },
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const record = useMemo<IntBlockResourceGas | null>(() => {
    const items = data?.int_block_resource_gas;
    if (!items?.length) return null;
    return items[0];
  }, [data]);

  const entries = useMemo(() => toResourceEntries(record), [record]);
  const refund = useMemo(() => getResourceRefund(record), [record]);
  const total = useMemo(() => getTotalResourceGas(record), [record]);

  return {
    entries,
    record,
    refund,
    total,
    isLoading,
    error: error as Error | null,
  };
}
