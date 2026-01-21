import { z } from 'zod';
import type { IntTransactionCallFrame, IntTransactionOpcodeGas } from '@/api/types.gen';

/**
 * Zod schema for gas profiler home page search parameters
 */
export const gasProfilerHomeSearchSchema = z.object({
  // Quick search by TX hash
  tx: z.string().optional(),
  // Jump to specific block
  block: z.coerce.number().optional(),
});

/**
 * Zod schema for block detail page search parameters
 */
export const gasProfilerBlockSearchSchema = z.object({
  // Sort transactions
  sort: z.enum(['index', 'gas', 'depth']).default('gas'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  // Filter by call type
  callType: z.string().optional(),
  // Highlight specific TX
  highlight: z.string().optional(),
});

/**
 * Zod schema for TX detail page search parameters
 */
export const gasProfilerTxSearchSchema = z.object({
  // Required: block number for efficient API queries
  block: z.coerce.number(),
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
