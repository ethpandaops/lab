import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionResourceGasServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntTransactionResourceGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { toResourceEntries, getResourceRefund, getTotalResourceGas } from '../utils/resourceGas';
import type { ResourceGasEntry } from '../utils/resourceGas';

export interface UseTransactionResourceGasOptions {
  transactionHash: string | null;
  blockNumber: number | null;
}

export interface UseTransactionResourceGasResult {
  /** Resource breakdown entries sorted by gas desc */
  entries: ResourceGasEntry[];
  /** Raw API record */
  record: IntTransactionResourceGas | null;
  /** Gas refund value */
  refund: number;
  /** Total resource gas (sum of 7 categories) */
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch transaction-level resource gas breakdown.
 * Uses the `int_transaction_resource_gas` API endpoint.
 */
export function useTransactionResourceGas({
  transactionHash,
  blockNumber,
}: UseTransactionResourceGasOptions): UseTransactionResourceGasResult {
  const { currentNetwork } = useNetwork();

  const enabled = !!currentNetwork && !!transactionHash && blockNumber !== null;

  const { data, isLoading, error } = useQuery({
    ...intTransactionResourceGasServiceListOptions({
      query: {
        transaction_hash_eq: transactionHash!,
        block_number_eq: blockNumber!,
        page_size: 1,
      },
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const record = useMemo<IntTransactionResourceGas | null>(() => {
    const items = data?.int_transaction_resource_gas;
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
