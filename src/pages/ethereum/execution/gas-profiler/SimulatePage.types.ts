import { z } from 'zod';
import { SIM_TX_SORT_FIELDS } from './utils/simulationTransactionFilters';

/**
 * Zod schema for simulate page search parameters
 */
export const gasProfilerSimulateSearchSchema = z.object({
  // Block number to simulate
  block: z.coerce.number().optional(),
  // Transactions tab: search, filters, sort and page
  txQ: z.coerce.string().optional(),
  txDiverged: z.boolean().optional().catch(undefined),
  txStatusChanged: z.boolean().optional().catch(undefined),
  txErrors: z.boolean().optional().catch(undefined),
  txStatus: z.enum(['succeeded', 'failed']).optional().catch(undefined),
  txChange: z.enum(['up', 'down', 'none']).optional().catch(undefined),
  txGasMin: z.coerce.number().min(0).optional().catch(undefined),
  txGasMax: z.coerce.number().min(0).optional().catch(undefined),
  txImpactMin: z.coerce.number().min(0).optional().catch(undefined),
  txSort: z.enum(SIM_TX_SORT_FIELDS).optional().catch(undefined),
  txDir: z.enum(['asc', 'desc']).optional().catch(undefined),
  txPage: z.coerce.number().int().min(0).optional().catch(undefined),
  txPageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});

export type GasProfilerSimulateSearch = z.infer<typeof gasProfilerSimulateSearchSchema>;

/**
 * Gas schedule with all configurable gas parameters
 * Each field is optional - only provided values override defaults
 * Parameters vary by fork - the API only returns valid params for the block's fork
 */
export interface GasSchedule {
  // Storage - SLOAD (pre-Berlin: single SLOAD, post-Berlin: cold/warm)
  SLOAD?: number; // pre-Berlin: 200 (EIP-150)
  SLOAD_COLD?: number; // Berlin+: 2100
  SLOAD_WARM?: number; // Berlin+: 100

  // Storage - SSTORE (Istanbul+: EIP-2200 net metered)
  SSTORE_SET?: number; // Istanbul+: 20000
  SSTORE_RESET?: number; // Istanbul+: 2900

  // Calls - access costs (pre-Berlin: single CALL_BASE, post-Berlin: cold/warm)
  CALL_BASE?: number; // pre-Berlin: varies by fork
  CALL_COLD?: number; // Berlin+: 2600
  CALL_WARM?: number; // Berlin+: 100
  CALL_VALUE_XFER?: number; // all forks: 9000
  CALL_NEW_ACCOUNT?: number; // all forks: 25000

  // Ethereum state access
  BALANCE?: number; // varies by fork (Frontier: 20, EIP-150: 400, EIP-1884: 700)
  EXTCODESIZE?: number; // varies by fork
  EXTCODECOPY?: number; // varies by fork (base cost)
  EXTCODEHASH?: number; // Constantinople+

  // Memory/Hashing
  KECCAK256?: number; // all forks: 30
  KECCAK256_WORD?: number; // all forks: 6
  MEMORY?: number; // all forks: 3
  COPY?: number; // all forks: 3

  // Logs
  LOG?: number; // all forks: 375
  LOG_TOPIC?: number; // all forks: 375
  LOG_DATA?: number; // all forks: 8

  // Creates
  CREATE?: number; // all forks: 32000
  CREATE2?: number; // Constantinople+: 32000

  // Contract termination
  SELFDESTRUCT?: number; // varies by fork

  // Exponentiation
  EXP?: number; // all forks: 10
  EXP_BYTE?: number; // Frontier: 10, EIP-160+: 50

  // Allow any additional parameters the API might return
  [key: string]: number | undefined;
}

/**
 * Gas parameter with value and description from API
 */
export interface GasParameterInfo {
  value: number;
  description: string;
}

/**
 * Gas schedule defaults with descriptions from API
 * Contains both the numeric values and human-readable descriptions for tooltips
 */
export interface GasScheduleDefaults {
  /** Map of parameter names to their values and descriptions */
  parameters: Record<string, GasParameterInfo>;
}

/**
 * Glamsterdam (EIP-8007) gas schedule preset.
 * Applies all gas parameter changes proposed for the Glamsterdam fork.
 *
 * EIP-7904: Compute repricing (opcodes + precompiles)
 * EIP-7976: Calldata floor cost increase
 * EIP-2780: Transaction base cost reduction
 * EIP-8038: State access repricing (TBD - using current values as placeholders)
 */
export const GLAMSTERDAM_PRESET: Record<string, number> = {
  // EIP-7904: Compute repricing
  DIV: 15,
  SDIV: 20,
  MOD: 12,
  MULMOD: 11,
  KECCAK256: 45,
  PC_BLAKE2F_BASE: 170,
  PC_BLAKE2F_PER_ROUND: 2,
  PC_BLS12_G1ADD: 643,
  PC_BLS12_G2ADD: 765,
  PC_BN254_ADD: 314,
  PC_BN254_PAIRING_PER_PAIR: 34103,
  PC_KZG_POINT_EVALUATION: 89363,

  // EIP-7976: Calldata floor
  TX_FLOOR_PER_TOKEN: 15,

  // EIP-2780: TX base cost
  TX_BASE: 4500,

  // EIP-8038: State access repricing (TBD - current values)
  SLOAD_COLD: 2100,
  SLOAD_WARM: 100,
  SSTORE_RESET: 2900,
  CALL_COLD: 2600,
  TX_ACCESS_LIST_ADDR: 2400,
  TX_ACCESS_LIST_KEY: 1900,
};

/**
 * Summary of gas usage (original or simulated)
 */
interface BlockGasSummary {
  gasUsed: number;
  gasLimit: number;
  wouldExceedLimit: boolean;
}

/**
 * Represents an error that occurred during a nested call in the call tree.
 * Used to show WHERE errors occur, not just that they occurred.
 */
export interface CallError {
  /** Call depth in the call tree (0 = top-level, 1+ = nested) */
  depth: number;
  /** Type of call (CALL, DELEGATECALL, STATICCALL, CREATE, etc.) */
  type: string;
  /** Error message (e.g., "execution reverted", "out of gas") */
  error: string;
  /** Target contract address (truncated to 20 chars) */
  address: string;
}

/**
 * Transaction summary from simulation (lightweight, no trace)
 */
export interface TxSummary {
  hash: string;
  index: number;
  originalStatus: 'success' | 'failed';
  simulatedStatus: 'success' | 'failed';
  originalGas: number;
  simulatedGas: number;
  deltaPercent: number;
  /** True if execution paths diverged (different opcode counts) */
  diverged: boolean;
  /** Number of REVERT opcodes in original execution (includes nested calls) */
  originalReverts: number;
  /** Number of REVERT opcodes in simulated execution (includes nested calls) */
  simulatedReverts: number;
  /** Errors from nested calls in original execution */
  originalErrors: CallError[];
  /** Errors from nested calls in simulated execution */
  simulatedErrors: CallError[];
  /** Pre-execution error (e.g. "intrinsic gas too low") when execution fails before the EVM runs */
  error?: string;
}

/**
 * Opcode-level gas summary
 * Counts and gas are tracked separately for original and simulated
 * because execution paths may diverge with different gas costs.
 */
export interface OpcodeSummary {
  originalCount: number;
  originalGas: number;
  simulatedCount: number;
  simulatedGas: number;
}

/**
 * Block simulation result (summaries only)
 */
export interface BlockSimulationResult {
  blockNumber: number;
  baseFork: string;
  customSchedule: GasSchedule;
  original: BlockGasSummary;
  simulated: BlockGasSummary;
  transactions: TxSummary[];
  opcodeBreakdown: Record<string, OpcodeSummary>;
}
