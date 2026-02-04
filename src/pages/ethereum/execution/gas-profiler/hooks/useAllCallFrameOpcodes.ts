import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionCallFrameOpcodeGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionCallFrameOpcodeGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

/**
 * Opcode data for a single call frame
 */
export interface CallFrameOpcodeData {
  opcode: string;
  gas: number;
  count: number;
  errorCount: number;
}

/**
 * Map of call_frame_id to array of opcode data
 */
export type AllCallFrameOpcodesMap = Map<number, CallFrameOpcodeData[]>;

export interface UseAllCallFrameOpcodesOptions {
  /** Transaction hash to fetch data for */
  transactionHash: string | null;
  /** Block number for efficient API queries (matches primary key prefix) */
  blockNumber: number | null;
  /** Whether to enable the query (use for toggle) */
  enabled?: boolean;
}

export interface UseAllCallFrameOpcodesResult {
  /** Map of call_frame_id to opcode data array */
  data: AllCallFrameOpcodesMap;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch ALL opcode data for ALL call frames in a transaction.
 * Use this when you need detailed opcode breakdown (e.g., for flame graph with opcodes).
 *
 * Unlike the badge query in useTransactionGasData which only fetches "interesting" opcodes,
 * this fetches every opcode for complete gas breakdown.
 */
export function useAllCallFrameOpcodes({
  transactionHash,
  blockNumber,
  enabled = true,
}: UseAllCallFrameOpcodesOptions): UseAllCallFrameOpcodesResult {
  const { currentNetwork } = useNetwork();

  const query = useQuery({
    queryKey: ['gas-profiler', 'all-call-frame-opcodes', transactionHash, blockNumber],
    queryFn: ({ signal }) =>
      fetchAllPages<IntTransactionCallFrameOpcodeGas>(
        intTransactionCallFrameOpcodeGasServiceList,
        {
          query: {
            transaction_hash_eq: transactionHash!,
            block_number_eq: blockNumber!,
            order_by: 'gas DESC',
            page_size: 10000,
          },
        },
        'int_transaction_call_frame_opcode_gas',
        signal
      ),
    enabled: !!currentNetwork && !!transactionHash && !!blockNumber && enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const data = useMemo<AllCallFrameOpcodesMap>(() => {
    const map = new Map<number, CallFrameOpcodeData[]>();

    if (!query.data) return map;

    for (const item of query.data) {
      const frameId = item.call_frame_id ?? 0;
      const opcodeData: CallFrameOpcodeData = {
        opcode: item.opcode ?? 'UNKNOWN',
        gas: item.gas ?? 0,
        count: item.count ?? 0,
        errorCount: item.error_count ?? 0,
      };

      const existing = map.get(frameId);
      if (existing) {
        existing.push(opcodeData);
      } else {
        map.set(frameId, [opcodeData]);
      }
    }

    return map;
  }, [query.data]);

  return {
    data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
