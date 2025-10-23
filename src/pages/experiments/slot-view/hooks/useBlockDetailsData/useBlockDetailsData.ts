import { useMemo } from 'react';
import type { FctBlockHead, FctBlockProposer, FctBlockMev } from '@/api/types.gen';
import type { BlockDetailsData } from './useBlockDetailsData.types';

export function useBlockDetailsData(
  blockHead: FctBlockHead | undefined,
  proposer: FctBlockProposer | undefined,
  mev: FctBlockMev | undefined
): BlockDetailsData | null {
  return useMemo(() => {
    if (!blockHead) return null;

    // Determine if block was produced on time (first 4 seconds of slot)
    // This would require slot start time comparison - for now, assume true
    const wasOnTime = true; // TODO: Calculate based on block timestamp vs slot start

    return {
      slot: blockHead.slot ?? 0,
      blockRoot: blockHead.block_root ?? '',
      blockVersion: blockHead.block_version ?? 'unknown',
      proposerIndex: blockHead.proposer_index ?? null,
      proposerPubkey: proposer?.proposer_pubkey ?? null,
      executionBlockNumber: blockHead.execution_payload_block_number ?? null,
      executionBlockHash: blockHead.execution_payload_block_hash ?? null,
      gasLimit: blockHead.execution_payload_gas_limit ?? null,
      gasUsed: blockHead.execution_payload_gas_used ?? null,
      baseFeePerGas: blockHead.execution_payload_base_fee_per_gas?.toString() ?? null,
      blobGasUsed: blockHead.execution_payload_blob_gas_used ?? null,
      transactionCount: blockHead.execution_payload_transactions_count ?? null,
      mevValue: mev?.value?.toString() ?? null,
      mevRelays: mev?.relay_names ?? null,
      builderPubkey: mev?.builder_pubkey ?? null,
      wasOnTime,
      status: (proposer?.status ?? 'canonical') as 'canonical' | 'orphaned' | 'missed',
    };
  }, [blockHead, proposer, mev]);
}
