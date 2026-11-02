import { z } from 'zod';
import type { IntTransactionCallFrame, IntTransactionOpcodeGas } from '@/api/types.gen';
import { BLOCK_TX_SORT_FIELDS } from './utils/blockTransactionFilters';

/**
 * Zod schema for gas profiler home page search parameters
 */
export const gasProfilerHomeSearchSchema = z.object({
  // Quick search by TX hash
  tx: z.string().optional(),
  // Jump to specific block
  block: z.coerce.number().optional(),
  // Time period for network analytics charts
  t: z.enum(['24h', '72h', '7d', '30d', '90d', '180d', '1y', '2y', 'all']).optional(),
});

const optionalCount = z.coerce.number().min(0).optional().catch(undefined);

/**
 * Zod schema for block detail page search parameters.
 * Transactions tab filters, sort and page live here so a filtered view can be shared.
 */
export const gasProfilerBlockSearchSchema = z.object({
  // Search by tx hash, target or called contract
  q: z.coerce.string().optional(),
  // `Transfer` or root call type
  type: z.coerce.string().optional(),
  status: z.enum(['succeeded', 'failed']).optional().catch(undefined),
  gasMin: optionalCount,
  gasMax: optionalCount,
  callsMin: optionalCount,
  callsMax: optionalCount,
  depthMin: optionalCount,
  depthMax: optionalCount,
  // Comma-separated opcodes the tx must execute
  opcodes: z.coerce.string().optional(),
  // Opcode category with the most gas
  category: z.coerce.string().optional(),
  // Sort transactions (defaults to gas, descending)
  sort: z.enum(BLOCK_TX_SORT_FIELDS).optional().catch(undefined),
  sortDir: z.enum(['asc', 'desc']).optional().catch(undefined),
  // Pagination (0-indexed page)
  page: z.coerce.number().int().min(0).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
  // Highlight specific TX
  highlight: z.string().optional(),
});

/**
 * Zod schema for TX detail page search parameters
 */
export const gasProfilerTxSearchSchema = z.object({
  // Optional: block number for efficient API queries (can be resolved from tx hash)
  block: z.coerce.number().optional(),
  // Selected frame ID (if drilling into specific frame)
  frame: z.coerce.number().optional(),
  // View mode for opcode panel
  opcodeView: z.enum(['chart', 'table']).default('chart'),
  // Opcode sort
  opcodeSort: z.enum(['gas', 'count']).default('gas'),
});

/**
 * Legacy schema for backwards compatibility
 * @deprecated Use gasProfilerHomeSearchSchema instead
 */
export const gasProfilerSearchSchema = gasProfilerHomeSearchSchema;

/**
 * TypeScript types inferred from Zod schemas
 */
export type GasProfilerHomeSearch = z.infer<typeof gasProfilerHomeSearchSchema>;
export type GasProfilerBlockSearch = z.infer<typeof gasProfilerBlockSearchSchema>;
export type GasProfilerTxSearch = z.infer<typeof gasProfilerTxSearchSchema>;

/**
 * Legacy type for backwards compatibility
 * @deprecated Use GasProfilerHomeSearch instead
 */
export type GasProfilerSearch = GasProfilerHomeSearch;

/**
 * Call frame data from the API
 */
export type CallFrame = IntTransactionCallFrame;

/**
 * Opcode gas data from the API
 */
export type OpcodeGas = IntTransactionOpcodeGas;

/**
 * Transaction metadata derived from call frames
 */
export interface TransactionMetadata {
  transactionHash: string;
  blockNumber: number;
  transactionIndex: number;
  status: 'success' | 'failed';
  receiptGasUsed: number;
  intrinsicGas: number | null;
  evmGasUsed: number;
  gasRefund: number;
  frameCount: number;
  maxDepth: number;
  /** Whether this is a contract creation transaction (CREATE) */
  isContractCreation: boolean;
}

/**
 * Processed call frame tree node for FlameGraph
 */
export interface CallTreeNode {
  id: string;
  label: string;
  value: number;
  selfValue?: number;
  children?: CallTreeNode[];
  category?: string;
  hasError?: boolean;
  metadata?: {
    callFrameId: number;
    targetAddress: string | null;
    targetName: string | null;
    functionSelector: string | null;
    functionName: string | null;
    callType: string;
    depth: number;
    opcodeCount: number;
    gasRefund: number | null;
  };
}

/**
 * Aggregated opcode stats for visualization
 */
export interface OpcodeStats {
  opcode: string;
  totalGas: number;
  count: number;
  errorCount: number;
  percentage: number;
}

/**
 * Gas breakdown segments for StackedBar
 */
export interface GasBreakdownSegment {
  name: string;
  value: number;
  color?: string;
  description?: string;
}
