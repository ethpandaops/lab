import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionReceiptSizeServiceList } from '@/api/sdk.gen';
import type { IntTransactionReceiptSize } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

export interface UseBlockReceiptSizesOptions {
  blockNumber: number | null;
}

export interface UseBlockReceiptSizesResult {
  /** Map of transaction hash → receipt size data for O(1) lookup */
  receiptsByTxHash: Map<string, IntTransactionReceiptSize>;
  /** Total receipt bytes across all transactions in the block */
  totalReceiptBytes: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch all receipt sizes for a block.
 * Uses `int_transaction_receipt_size` API with `block_number_eq` filter.
 */
export function useBlockReceiptSizes({ blockNumber }: UseBlockReceiptSizesOptions): UseBlockReceiptSizesResult {
  const { currentNetwork } = useNetwork();

  const enabled = !!currentNetwork && blockNumber !== null && !isNaN(blockNumber);

  const { data, isLoading, error } = useQuery({
    queryKey: ['blockReceiptSizes', blockNumber],
    queryFn: ({ signal }) =>
      fetchAllPages<IntTransactionReceiptSize>(
        intTransactionReceiptSizeServiceList,
        {
          query: {
            block_number_eq: blockNumber!,
            page_size: 10000,
          },
        },
        'int_transaction_receipt_size',
        signal
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const receiptsByTxHash = useMemo(() => {
    const map = new Map<string, IntTransactionReceiptSize>();
    if (!data) return map;
    for (const item of data) {
      if (item.transaction_hash) {
        map.set(item.transaction_hash, item);
      }
    }
    return map;
  }, [data]);

  const totalReceiptBytes = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + (item.receipt_bytes ?? 0), 0);
  }, [data]);

  return {
    receiptsByTxHash,
    totalReceiptBytes,
    isLoading,
    error: error as Error | null,
  };
}
