import { describe, expect, it } from 'vitest';
import type { TransactionSummary } from '../hooks/useBlockTransactions';
import type { TransactionOpcodeProfile } from '../hooks/useBlockTransactionOpcodes';
import { filterBlockTransactions, formatRangeChip, sortBlockTransactions } from './blockTransactionFilters';

function tx(overrides: Partial<TransactionSummary> & { transactionIndex: number }): TransactionSummary {
  return {
    transactionHash: `0x${String(overrides.transactionIndex).padStart(4, '0')}`,
    totalGasUsed: 21_000,
    intrinsicGas: 21_000,
    gasRefund: 0,
    frameCount: 1,
    maxDepth: 0,
    hasErrors: false,
    rootCallType: 'CALL',
    targetAddress: null,
    targetName: null,
    ...overrides,
  };
}

const transfer = tx({ transactionIndex: 0 });
const swap = tx({
  transactionIndex: 1,
  totalGasUsed: 180_000,
  intrinsicGas: 22_000,
  gasRefund: 4_800,
  frameCount: 12,
  maxDepth: 4,
  targetAddress: '0xRouter',
  targetName: 'Uniswap Router',
});
const failed = tx({ transactionIndex: 2, totalGasUsed: 50_000, intrinsicGas: null, hasErrors: true, frameCount: 3 });
const deploy = tx({ transactionIndex: 3, totalGasUsed: 1_200_000, intrinsicGas: 53_000, rootCallType: 'CREATE' });
const all = [transfer, swap, failed, deploy];

const hashes = (list: TransactionSummary[]): string[] => list.map(t => t.transactionHash);

describe('filterBlockTransactions', () => {
  it('separates plain transfers from contract calls that share a root call type', () => {
    expect(hashes(filterBlockTransactions(all, { type: 'Transfer' }))).toEqual([transfer.transactionHash]);
    expect(hashes(filterBlockTransactions(all, { type: 'CALL' }))).toEqual([
      swap.transactionHash,
      failed.transactionHash,
    ]);
  });

  it('treats range bounds as inclusive and combines filters with AND', () => {
    expect(hashes(filterBlockTransactions(all, { gasMin: 50_000, gasMax: 180_000 }))).toEqual([
      swap.transactionHash,
      failed.transactionHash,
    ]);
    expect(hashes(filterBlockTransactions(all, { gasMin: 50_000, status: 'succeeded' }))).toEqual([
      swap.transactionHash,
      deploy.transactionHash,
    ]);
  });

  it('finds a transaction by a contract it calls deeper in the tree', () => {
    const calledContracts = new Map([[failed.transactionHash, [{ address: '0xPool', name: 'WETH Pool' }]]]);
    expect(hashes(filterBlockTransactions(all, { q: 'weth' }, { calledContracts }))).toEqual([failed.transactionHash]);
    expect(hashes(filterBlockTransactions(all, { q: 'uniswap' }, { calledContracts }))).toEqual([swap.transactionHash]);
  });

  it('requires every listed opcode and matches nothing until opcode data loads', () => {
    const profile = (ops: string[], topCategory: string): TransactionOpcodeProfile => ({
      opcodes: new Set(ops),
      topCategory,
    });
    const opcodeProfiles = new Map([
      [swap.transactionHash, profile(['SLOAD', 'SSTORE', 'CALL'], 'Storage')],
      [deploy.transactionHash, profile(['SSTORE', 'CODECOPY'], 'Contract')],
    ]);
    expect(filterBlockTransactions(all, { opcodes: 'sstore' })).toEqual([]);
    expect(hashes(filterBlockTransactions(all, { opcodes: 'sstore' }, { opcodeProfiles }))).toEqual([
      swap.transactionHash,
      deploy.transactionHash,
    ]);
    expect(hashes(filterBlockTransactions(all, { opcodes: 'SSTORE,CALL' }, { opcodeProfiles }))).toEqual([
      swap.transactionHash,
    ]);
    expect(hashes(filterBlockTransactions(all, { category: 'Contract' }, { opcodeProfiles }))).toEqual([
      deploy.transactionHash,
    ]);
  });
});

describe('sortBlockTransactions', () => {
  it('sorts by EVM gas and puts transactions without intrinsic gas last in both directions', () => {
    // EVM gas: transfer 0, swap 162,800, deploy 1,147,000, failed unknown
    expect(hashes(sortBlockTransactions(all, 'evm', 'desc'))).toEqual([
      deploy.transactionHash,
      swap.transactionHash,
      transfer.transactionHash,
      failed.transactionHash,
    ]);
    expect(hashes(sortBlockTransactions(all, 'evm', 'asc'))).toEqual([
      transfer.transactionHash,
      swap.transactionHash,
      deploy.transactionHash,
      failed.transactionHash,
    ]);
  });

  it('sorts receipt size from the lookup, with missing receipts last', () => {
    const receiptBytes = new Map([
      [transfer.transactionHash, 110],
      [deploy.transactionHash, 300],
      [swap.transactionHash, 900],
    ]);
    expect(hashes(sortBlockTransactions(all, 'receipt', 'asc', receiptBytes))).toEqual([
      transfer.transactionHash,
      deploy.transactionHash,
      swap.transactionHash,
      failed.transactionHash,
    ]);
  });
});

describe('formatRangeChip', () => {
  it('shows one or both bounds', () => {
    expect(formatRangeChip(1_000_000, undefined)).toBe('≥1M');
    expect(formatRangeChip(undefined, 250_000)).toBe('≤250K');
    expect(formatRangeChip(0, 1_500_000)).toBe('0–1.5M');
    expect(formatRangeChip(undefined, undefined)).toBeUndefined();
  });
});
