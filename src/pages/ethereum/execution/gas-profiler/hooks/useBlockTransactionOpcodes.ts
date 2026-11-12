import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { intTransactionOpcodeGasServiceList } from '@/api/sdk.gen';
import type { IntTransactionOpcodeGas } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { getOpcodeCategory } from '@/pages/ethereum/execution/gas-profiler/utils/opcodeUtils';

/** Which opcodes a transaction executes and where most of its opcode gas goes */
export interface TransactionOpcodeProfile {
  opcodes: Set<string>;
  /** Opcode category with the most gas, or null when the tx ran no opcodes */
  topCategory: string | null;
}

export interface UseBlockTransactionOpcodesOptions {
  blockNumber: number;
  enabled: boolean;
}

export interface UseBlockTransactionOpcodesResult {
  /** Raw per-transaction opcode rows for the block */
  rows: IntTransactionOpcodeGas[] | undefined;
  /** Opcode profile per transaction hash */
  profiles: Map<string, TransactionOpcodeProfile> | undefined;
  isLoading: boolean;
}

/**
 * Per-transaction opcode gas for every transaction in a block.
 * Shared by the opcode heatmap and the transaction filters, so both read one cached request.
 */
export function useBlockTransactionOpcodes({
  blockNumber,
  enabled,
}: UseBlockTransactionOpcodesOptions): UseBlockTransactionOpcodesResult {
  const { data, isLoading } = useQuery({
    queryKey: ['int-transaction-opcode-gas-all', blockNumber],
    queryFn: ({ signal }) =>
      fetchAllPages<IntTransactionOpcodeGas>(
        intTransactionOpcodeGasServiceList,
        { query: { block_number_eq: blockNumber, page_size: 10000 } },
        'int_transaction_opcode_gas',
        signal
      ),
    enabled: enabled && !isNaN(blockNumber),
  });

  const profiles = useMemo(() => {
    if (!data) return undefined;
    const byTx = new Map<string, { opcodes: Set<string>; categoryGas: Map<string, number> }>();
    for (const row of data) {
      if (!row.transaction_hash || !row.opcode) continue;
      let entry = byTx.get(row.transaction_hash);
      if (!entry) {
        entry = { opcodes: new Set(), categoryGas: new Map() };
        byTx.set(row.transaction_hash, entry);
      }
      entry.opcodes.add(row.opcode.toUpperCase());
      const category = getOpcodeCategory(row.opcode);
      entry.categoryGas.set(category, (entry.categoryGas.get(category) ?? 0) + (row.gas ?? 0));
    }

    const result = new Map<string, TransactionOpcodeProfile>();
    for (const [hash, { opcodes, categoryGas }] of byTx) {
      let topCategory: string | null = null;
      let topGas = -1;
      for (const [category, gas] of categoryGas) {
        if (gas > topGas) {
          topCategory = category;
          topGas = gas;
        }
      }
      result.set(hash, { opcodes, topCategory });
    }
    return result;
  }, [data]);

  return { rows: data, profiles, isLoading: enabled && isLoading };
}
