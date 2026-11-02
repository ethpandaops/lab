import type { TransactionSummary } from '../hooks/useBlockTransactions';
import type { TransactionOpcodeProfile } from '../hooks/useBlockTransactionOpcodes';

/**
 * Numeric columns the block transaction table can sort by.
 * `share` sorts by gas, since a transaction's share of the block follows its gas.
 */
export const BLOCK_TX_SORT_FIELDS = [
  'index',
  'gas',
  'share',
  'intrinsic',
  'evm',
  'refund',
  'receipt',
  'calls',
  'depth',
] as const;

export type BlockTxSortField = (typeof BLOCK_TX_SORT_FIELDS)[number];

export const DEFAULT_BLOCK_TX_SORT: BlockTxSortField = 'gas';
export const DEFAULT_BLOCK_TX_PAGE_SIZE = 25;

/** Filters applied to a block's transactions; every field is optional and they combine with AND */
export interface BlockTxFilters {
  /** Matches tx hash, target address or name, or any contract the tx calls */
  q?: string;
  /** `Transfer` or the root call type (`CALL`, `CREATE`) */
  type?: string;
  status?: 'succeeded' | 'failed';
  gasMin?: number;
  gasMax?: number;
  callsMin?: number;
  callsMax?: number;
  depthMin?: number;
  depthMax?: number;
  /** Comma-separated opcodes the tx must execute (all of them) */
  opcodes?: string;
  /** Opcode category the tx spends the most opcode gas on */
  category?: string;
}

/** Keys of {@link BlockTxFilters}, used to clear every filter at once */
export const BLOCK_TX_FILTER_KEYS = [
  'q',
  'type',
  'status',
  'gasMin',
  'gasMax',
  'callsMin',
  'callsMax',
  'depthMin',
  'depthMax',
  'opcodes',
  'category',
] as const satisfies readonly (keyof BlockTxFilters)[];

/** A contract a transaction calls somewhere in its call tree */
export interface CalledContract {
  address: string;
  name: string | null;
}

/** Lookups the filters need beyond the transaction summary itself */
export interface BlockTxFilterContext {
  /** Contracts each transaction calls, keyed by tx hash */
  calledContracts?: Map<string, CalledContract[]>;
  /** Per-transaction opcode profile, keyed by tx hash. Required for `opcodes` and `category`. */
  opcodeProfiles?: Map<string, TransactionOpcodeProfile>;
  /** Receipt size in bytes, keyed by tx hash */
  receiptBytes?: Map<string, number>;
}

/** Whether a transaction is a plain value transfer (no EVM execution beyond intrinsic gas) */
export function isSimpleTransfer(tx: TransactionSummary): boolean {
  return tx.intrinsicGas !== null && tx.totalGasUsed === tx.intrinsicGas;
}

/** Type label shown for a transaction: `Transfer` or its root call type */
export function getTransactionType(tx: TransactionSummary): string {
  return isSimpleTransfer(tx) ? 'Transfer' : tx.rootCallType;
}

/** Gas spent executing EVM code: receipt gas + refund - intrinsic. Undefined when intrinsic gas is unknown. */
export function getEvmGas(tx: TransactionSummary): number | undefined {
  if (tx.intrinsicGas === null) return undefined;
  return tx.totalGasUsed + tx.gasRefund - tx.intrinsicGas;
}

/** Split a comma-separated opcode list into upper-cased opcodes */
export function parseOpcodeList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(op => op.trim().toUpperCase())
    .filter(Boolean);
}

/** Whether any filter is set */
export function hasActiveBlockTxFilters(filters: BlockTxFilters): boolean {
  return BLOCK_TX_FILTER_KEYS.some(key => filters[key] !== undefined && filters[key] !== '');
}

/** Whether the filters need per-transaction opcode data */
export function needsOpcodeProfiles(filters: BlockTxFilters): boolean {
  return parseOpcodeList(filters.opcodes).length > 0 || !!filters.category;
}

function inRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function matchesSearch(tx: TransactionSummary, query: string, calledContracts?: CalledContract[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (tx.transactionHash.toLowerCase().includes(q)) return true;
  if (tx.targetAddress?.toLowerCase().includes(q)) return true;
  if (tx.targetName?.toLowerCase().includes(q)) return true;
  return (calledContracts ?? []).some(c => c.address.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q));
}

/**
 * Apply filters to a block's transactions. Opcode filters match nothing until
 * `context.opcodeProfiles` is provided.
 */
export function filterBlockTransactions(
  transactions: TransactionSummary[],
  filters: BlockTxFilters,
  context: BlockTxFilterContext = {}
): TransactionSummary[] {
  const opcodes = parseOpcodeList(filters.opcodes);

  return transactions.filter(tx => {
    if (filters.type && getTransactionType(tx) !== filters.type) return false;
    if (filters.status === 'failed' && !tx.hasErrors) return false;
    if (filters.status === 'succeeded' && tx.hasErrors) return false;
    if (!inRange(tx.totalGasUsed, filters.gasMin, filters.gasMax)) return false;
    if (!inRange(tx.frameCount, filters.callsMin, filters.callsMax)) return false;
    if (!inRange(tx.maxDepth, filters.depthMin, filters.depthMax)) return false;

    if (opcodes.length > 0 || filters.category) {
      const profile = context.opcodeProfiles?.get(tx.transactionHash);
      if (!profile) return false;
      if (!opcodes.every(op => profile.opcodes.has(op))) return false;
      if (filters.category && profile.topCategory !== filters.category) return false;
    }

    if (filters.q && !matchesSearch(tx, filters.q, context.calledContracts?.get(tx.transactionHash))) return false;

    return true;
  });
}

/** Value a transaction sorts by for a column; undefined sorts last in either direction */
export function getBlockTxSortValue(
  tx: TransactionSummary,
  field: BlockTxSortField,
  receiptBytes?: Map<string, number>
): number | undefined {
  switch (field) {
    case 'index':
      return tx.transactionIndex;
    case 'gas':
    case 'share':
      return tx.totalGasUsed;
    case 'intrinsic':
      return tx.intrinsicGas ?? undefined;
    case 'evm':
      return getEvmGas(tx);
    case 'refund':
      return tx.gasRefund;
    case 'receipt':
      return receiptBytes?.get(tx.transactionHash);
    case 'calls':
      return tx.frameCount;
    case 'depth':
      return tx.maxDepth;
  }
}

/**
 * Sort transactions by a column. Ties keep block order; missing values go last.
 */
export function sortBlockTransactions(
  transactions: TransactionSummary[],
  field: BlockTxSortField,
  dir: 'asc' | 'desc',
  receiptBytes?: Map<string, number>
): TransactionSummary[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...transactions].sort((a, b) => {
    const av = getBlockTxSortValue(a, field, receiptBytes);
    const bv = getBlockTxSortValue(b, field, receiptBytes);
    if (av === undefined || bv === undefined) {
      if (av === bv) return a.transactionIndex - b.transactionIndex;
      return av === undefined ? 1 : -1;
    }
    return (av - bv) * sign || a.transactionIndex - b.transactionIndex;
  });
}

/** Compact number for chips: 1.5M, 250K, 42 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** Chip text for a min/max range, or undefined when neither bound is set */
export function formatRangeChip(
  min: number | undefined,
  max: number | undefined,
  format: (value: number) => string = formatCompactNumber
): string | undefined {
  if (min !== undefined && max !== undefined) return `${format(min)}–${format(max)}`;
  if (min !== undefined) return `≥${format(min)}`;
  if (max !== undefined) return `≤${format(max)}`;
  return undefined;
}
