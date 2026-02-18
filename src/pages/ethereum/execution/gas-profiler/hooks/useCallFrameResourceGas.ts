import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionCallFrameOpcodeResourceGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionCallFrameOpcodeResourceGas } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { aggregateOpcodeResourceGas, toOpcodeResourceRows } from '../utils/resourceGas';
import type { ResourceGasEntry, OpcodeResourceRow } from '../utils/resourceGas';

export interface UseCallFrameResourceGasOptions {
  /** Transaction hash (optional — omit to fetch all transactions in the block) */
  transactionHash: string | null;
  blockNumber: number | null;
  /** Specific call frame ID. If null, fetches all frames. */
  callFrameId: number | null;
}

export interface UseCallFrameResourceGasResult {
  /** Aggregated resource breakdown entries */
  entries: ResourceGasEntry[];
  /** Per-opcode resource attribution rows */
  opcodeRows: OpcodeResourceRow[];
  /** Raw records */
  records: IntTransactionCallFrameOpcodeResourceGas[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch per-opcode resource gas for a call frame, transaction, or entire block.
 * Uses the `int_transaction_call_frame_opcode_resource_gas` API endpoint.
 * Aggregates the per-opcode data into resource category totals.
 *
 * - With transactionHash + callFrameId: single call frame
 * - With transactionHash only: all frames in a transaction
 * - With blockNumber only: all opcodes in a block (across all transactions)
 */
export function useCallFrameResourceGas({
  transactionHash,
  blockNumber,
  callFrameId,
}: UseCallFrameResourceGasOptions): UseCallFrameResourceGasResult {
  const { currentNetwork } = useNetwork();

  // Requires at least a block number
  const enabled = !!currentNetwork && blockNumber !== null;

  const {
    data: rawRecords,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gas-profiler', 'call-frame-resource-gas', blockNumber, transactionHash, callFrameId],
    queryFn: ({ signal }) => {
      const query: Record<string, unknown> = {
        block_number_eq: blockNumber!,
        order_by: 'gas DESC',
        page_size: 10000,
      };
      if (transactionHash) {
        query.transaction_hash_eq = transactionHash;
      }
      if (callFrameId !== null) {
        query.call_frame_id_eq = callFrameId;
      }
      return fetchAllPages<IntTransactionCallFrameOpcodeResourceGas>(
        intTransactionCallFrameOpcodeResourceGasServiceList,
        { query },
        'int_transaction_call_frame_opcode_resource_gas',
        signal
      );
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const records = useMemo(() => rawRecords ?? [], [rawRecords]);
  const entries = useMemo(() => aggregateOpcodeResourceGas(records), [records]);
  const opcodeRows = useMemo(() => toOpcodeResourceRows(records), [records]);

  return {
    entries,
    opcodeRows,
    records,
    isLoading,
    error: error as Error | null,
  };
}
