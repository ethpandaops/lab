import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionReceiptSizeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntTransactionReceiptSize } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';

export interface UseTransactionReceiptSizeOptions {
  transactionHash: string | null;
  blockNumber: number | null;
}

export interface UseTransactionReceiptSizeResult {
  /** Receipt size data for the transaction */
  data: IntTransactionReceiptSize | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch receipt size data for a single transaction.
 * Uses `int_transaction_receipt_size` API with `transaction_hash_eq` filter.
 */
export function useTransactionReceiptSize({
  transactionHash,
  blockNumber,
}: UseTransactionReceiptSizeOptions): UseTransactionReceiptSizeResult {
  const { currentNetwork } = useNetwork();

  const enabled = !!currentNetwork && !!transactionHash;

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    ...intTransactionReceiptSizeServiceListOptions({
      query: {
        transaction_hash_eq: transactionHash!,
        ...(blockNumber !== null && { block_number_eq: blockNumber }),
        page_size: 1,
      },
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<IntTransactionReceiptSize | null>(() => {
    const items = response?.int_transaction_receipt_size;
    if (!items?.length) return null;
    return items[0];
  }, [response]);

  return {
    data,
    isLoading,
    error: error as Error | null,
  };
}
