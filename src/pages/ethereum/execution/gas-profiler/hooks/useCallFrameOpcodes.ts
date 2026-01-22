import { useQuery } from '@tanstack/react-query';
import { intTransactionCallFrameOpcodeGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionCallFrameOpcodeGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

/**
 * Processed opcode data for display
 */
export interface OpcodeBreakdown {
  opcode: string;
  gas: number;
  count: number;
  errorCount: number;
  percentage: number;
}

export interface UseCallFrameOpcodesOptions {
  /** Block number containing the transaction (optional) */
  blockNumber?: number | null;
  /** Transaction hash */
  transactionHash: string;
  /** Call frame ID to fetch opcodes for */
  callFrameId: number;
  /** Whether to fetch (for lazy loading) */
  enabled: boolean;
}

export interface UseCallFrameOpcodesResult {
  data: OpcodeBreakdown[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch opcode breakdown for a specific call frame.
 * Used for lazy-loading detailed opcode info in the trace view.
 */
export function useCallFrameOpcodes({
  blockNumber,
  transactionHash,
  callFrameId,
  enabled,
}: UseCallFrameOpcodesOptions): UseCallFrameOpcodesResult {
  const { currentNetwork } = useNetwork();

  const { data, isLoading, error } = useQuery({
    queryKey: ['gas-profiler', 'call-frame-opcodes', transactionHash, callFrameId],
    queryFn: async ({ signal }) => {
      const rawData = await fetchAllPages<IntTransactionCallFrameOpcodeGas>(
        intTransactionCallFrameOpcodeGasServiceList,
        {
          query: {
            block_number_eq: blockNumber,
            transaction_hash_eq: transactionHash,
            call_frame_id_eq: callFrameId,
            // No opcode filter - get all opcodes
            order_by: 'gas DESC',
            page_size: 10000,
          },
        },
        'int_transaction_call_frame_opcode_gas',
        signal
      );

      // Calculate total gas for percentage
      const totalGas = rawData.reduce((sum, item) => sum + (item.gas ?? 0), 0);

      // Process into breakdown format
      const breakdown: OpcodeBreakdown[] = rawData.map(item => ({
        opcode: item.opcode ?? 'UNKNOWN',
        gas: item.gas ?? 0,
        count: item.count ?? 0,
        errorCount: item.error_count ?? 0,
        percentage: totalGas > 0 ? ((item.gas ?? 0) / totalGas) * 100 : 0,
      }));

      return breakdown;
    },
    enabled: enabled && !!currentNetwork && !!transactionHash && !!blockNumber && callFrameId > 0,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
