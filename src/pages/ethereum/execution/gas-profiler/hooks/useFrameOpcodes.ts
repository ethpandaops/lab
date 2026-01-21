import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionCallFrameOpcodeGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionCallFrameOpcodeGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import type { OpcodeStats } from '../IndexPage.types';

export interface UseFrameOpcodesOptions {
  /** Block number containing the transaction */
  blockNumber: number | null;
  /** Transaction hash */
  transactionHash: string | null;
  /** Call frame ID to get opcodes for */
  callFrameId: number | null;
}

export interface UseFrameOpcodesResult {
  data: OpcodeStats[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Transform API response to OpcodeStats format
 */
function transformOpcodes(opcodes: IntTransactionCallFrameOpcodeGas[]): OpcodeStats[] {
  const totalGas = opcodes.reduce((sum, op) => sum + (op.gas ?? 0), 0);

  return opcodes
    .map(op => {
      const gas = op.gas ?? 0;
      return {
        opcode: op.opcode ?? 'UNKNOWN',
        totalGas: gas,
        count: op.count ?? 0,
        errorCount: op.error_count ?? 0,
        percentage: totalGas > 0 ? (gas / totalGas) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalGas - a.totalGas);
}

/**
 * Hook to fetch opcodes for a specific call frame
 */
export function useFrameOpcodes({
  blockNumber,
  transactionHash,
  callFrameId,
}: UseFrameOpcodesOptions): UseFrameOpcodesResult {
  const { currentNetwork } = useNetwork();

  const enabled = !!currentNetwork && blockNumber !== null && !!transactionHash && callFrameId !== null;

  const {
    data: rawOpcodes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gas-profiler', 'frame-opcodes', blockNumber, transactionHash, callFrameId],
    queryFn: ({ signal }) =>
      fetchAllPages<IntTransactionCallFrameOpcodeGas>(
        intTransactionCallFrameOpcodeGasServiceList,
        {
          query: {
            block_number_eq: blockNumber!,
            transaction_hash_eq: transactionHash!,
            call_frame_id_eq: callFrameId!,
            order_by: 'gas DESC',
            page_size: 10000,
          },
        },
        'int_transaction_call_frame_opcode_gas',
        signal
      ),
    enabled,
  });

  const data = useMemo(() => {
    if (!rawOpcodes) return [];
    return transformOpcodes(rawOpcodes);
  }, [rawOpcodes]);

  return {
    data,
    isLoading,
    error: error as Error | null,
  };
}
