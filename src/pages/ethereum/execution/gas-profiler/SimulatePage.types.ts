import { z } from 'zod';

/**
 * Zod schema for simulate page search parameters
 */
export const gasProfilerSimulateSearchSchema = z.object({
  // Block number to simulate
  block: z.coerce.number().optional(),
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
 * Gas parameter metadata for UI rendering
 * Note: Default values come from the API (fork-aware), not from this metadata
 */
export interface GasParameterMeta {
  key: keyof GasSchedule;
  label: string;
  min: number;
  max: number;
  step: number;
  description?: string;
}

/**
 * Grouped gas parameters for organized UI
 * Category names and colors align with OPCODE_CATEGORIES and CATEGORY_COLORS
 * from utils/opcodeUtils.ts for visual consistency across the gas profiler.
 */
export interface GasParameterGroup {
  /** Category name - matches opcode category names for consistency */
  name: string;
  /** Category color hex value - matches CATEGORY_COLORS from opcodeUtils */
  color: string;
  /** Gas parameters in this category */
  parameters: GasParameterMeta[];
}

/**
 * All gas parameter groups for the editor UI
 * Groups are ordered by typical gas impact (highest first)
 * Colors match CATEGORY_COLORS from utils/opcodeUtils.ts
 */
export const GAS_PARAMETER_GROUPS: GasParameterGroup[] = [
  {
    name: 'Storage',
    color: '#ef4444', // red - matches CATEGORY_COLORS.Storage
    parameters: [
      // Pre-Berlin: single SLOAD cost
      { key: 'SLOAD', label: 'SLOAD', min: 0, max: 2000, step: 50 },
      // Post-Berlin (EIP-2929): cold/warm access costs
      { key: 'SLOAD_COLD', label: 'SLOAD Cold', min: 0, max: 10000, step: 100 },
      { key: 'SLOAD_WARM', label: 'SLOAD Warm', min: 0, max: 1000, step: 10 },
      { key: 'SSTORE_SET', label: 'SSTORE Set', min: 0, max: 50000, step: 1000 },
      { key: 'SSTORE_RESET', label: 'SSTORE Reset', min: 0, max: 10000, step: 100 },
    ],
  },
  {
    name: 'Transient Storage',
    color: '#f97316', // orange - matches CATEGORY_COLORS['Transient Storage']
    parameters: [
      { key: 'TLOAD', label: 'TLOAD', min: 0, max: 1000, step: 10 },
      { key: 'TSTORE', label: 'TSTORE', min: 0, max: 1000, step: 10 },
    ],
  },
  {
    name: 'Contract',
    color: '#0ea5e9', // sky - matches CATEGORY_COLORS.Contract
    parameters: [
      // Pre-Berlin: single CALL_BASE cost
      { key: 'CALL_BASE', label: 'CALL Base', min: 0, max: 2000, step: 50 },
      // Post-Berlin (EIP-2929): cold/warm access costs
      { key: 'CALL_COLD', label: 'CALL Cold', min: 0, max: 10000, step: 100 },
      { key: 'CALL_WARM', label: 'CALL Warm', min: 0, max: 1000, step: 10 },
      { key: 'CALL_VALUE_XFER', label: 'Value Transfer', min: 0, max: 20000, step: 500 },
      { key: 'CALL_NEW_ACCOUNT', label: 'New Account', min: 0, max: 50000, step: 1000 },
      { key: 'CREATE', label: 'CREATE', min: 0, max: 100000, step: 1000 },
      { key: 'CREATE2', label: 'CREATE2', min: 0, max: 100000, step: 1000 },
      { key: 'SELFDESTRUCT', label: 'SELFDESTRUCT', min: 0, max: 10000, step: 100 },
    ],
  },
  {
    name: 'Ethereum State',
    color: '#3b82f6', // blue - matches CATEGORY_COLORS['Ethereum State']
    parameters: [
      { key: 'BALANCE', label: 'BALANCE', min: 0, max: 2000, step: 50 },
      { key: 'EXTCODESIZE', label: 'EXTCODESIZE', min: 0, max: 2000, step: 50 },
      { key: 'EXTCODECOPY', label: 'EXTCODECOPY', min: 0, max: 2000, step: 50 },
      { key: 'EXTCODEHASH', label: 'EXTCODEHASH', min: 0, max: 2000, step: 50 },
      { key: 'CALLDATALOAD', label: 'CALLDATALOAD', min: 0, max: 20, step: 1 },
      // Cancun blob opcodes
      { key: 'BLOBHASH', label: 'BLOBHASH', min: 0, max: 20, step: 1 },
      { key: 'BLOBBASEFEE', label: 'BLOBBASEFEE', min: 0, max: 20, step: 1 },
    ],
  },
  {
    name: 'Log',
    color: '#eab308', // yellow - matches CATEGORY_COLORS.Log
    parameters: [
      { key: 'LOG', label: 'LOG Base', min: 0, max: 2000, step: 25 },
      { key: 'LOG_TOPIC', label: 'LOG Topic', min: 0, max: 2000, step: 25 },
      { key: 'LOG_DATA', label: 'LOG Data', min: 0, max: 50, step: 1 },
    ],
  },
  {
    name: 'Math',
    color: '#f59e0b', // amber - matches CATEGORY_COLORS.Math
    parameters: [
      // Simple (gas = 3)
      { key: 'ADD', label: 'ADD', min: 0, max: 20, step: 1 },
      { key: 'SUB', label: 'SUB', min: 0, max: 20, step: 1 },
      // Medium (gas = 5)
      { key: 'MUL', label: 'MUL', min: 0, max: 30, step: 1 },
      { key: 'DIV', label: 'DIV', min: 0, max: 30, step: 1 },
      { key: 'SDIV', label: 'SDIV', min: 0, max: 30, step: 1 },
      { key: 'MOD', label: 'MOD', min: 0, max: 30, step: 1 },
      { key: 'SMOD', label: 'SMOD', min: 0, max: 30, step: 1 },
      { key: 'SIGNEXTEND', label: 'SIGNEXTEND', min: 0, max: 30, step: 1 },
      // Higher (gas = 8)
      { key: 'ADDMOD', label: 'ADDMOD', min: 0, max: 50, step: 1 },
      { key: 'MULMOD', label: 'MULMOD', min: 0, max: 50, step: 1 },
      // Exponentiation
      { key: 'EXP', label: 'EXP Base', min: 0, max: 100, step: 5 },
      { key: 'EXP_BYTE', label: 'EXP Byte', min: 0, max: 200, step: 10 },
    ],
  },
  {
    name: 'Comparisons',
    color: '#8b5cf6', // purple - matches CATEGORY_COLORS.Comparisons
    parameters: [
      { key: 'LT', label: 'LT', min: 0, max: 20, step: 1 },
      { key: 'GT', label: 'GT', min: 0, max: 20, step: 1 },
      { key: 'SLT', label: 'SLT', min: 0, max: 20, step: 1 },
      { key: 'SGT', label: 'SGT', min: 0, max: 20, step: 1 },
      { key: 'EQ', label: 'EQ', min: 0, max: 20, step: 1 },
      { key: 'ISZERO', label: 'ISZERO', min: 0, max: 20, step: 1 },
    ],
  },
  {
    name: 'Logic',
    color: '#06b6d4', // cyan - matches CATEGORY_COLORS.Logic
    parameters: [
      { key: 'AND', label: 'AND', min: 0, max: 20, step: 1 },
      { key: 'OR', label: 'OR', min: 0, max: 20, step: 1 },
      { key: 'XOR', label: 'XOR', min: 0, max: 20, step: 1 },
      { key: 'NOT', label: 'NOT', min: 0, max: 20, step: 1 },
    ],
  },
  {
    name: 'Bit Ops',
    color: '#14b8a6', // teal - matches CATEGORY_COLORS['Bit Ops']
    parameters: [
      { key: 'BYTE', label: 'BYTE', min: 0, max: 20, step: 1 },
      // Constantinople+ (EIP-145)
      { key: 'SHL', label: 'SHL', min: 0, max: 20, step: 1 },
      { key: 'SHR', label: 'SHR', min: 0, max: 20, step: 1 },
      { key: 'SAR', label: 'SAR', min: 0, max: 20, step: 1 },
    ],
  },
  {
    name: 'Jump',
    color: '#ec4899', // pink - matches CATEGORY_COLORS.Jump
    parameters: [
      { key: 'JUMP', label: 'JUMP', min: 0, max: 50, step: 1 },
      { key: 'JUMPI', label: 'JUMPI', min: 0, max: 50, step: 1 },
    ],
  },
  {
    name: 'Pop',
    color: '#a855f7', // violet - matches CATEGORY_COLORS.Pop
    parameters: [
      { key: 'POP', label: 'POP', min: 0, max: 20, step: 1 },
      // Shanghai+ (EIP-3855)
      { key: 'PUSH0', label: 'PUSH0', min: 0, max: 20, step: 1 },
    ],
  },
  {
    name: 'Memory',
    color: '#22c55e', // green - matches CATEGORY_COLORS.Memory
    parameters: [
      { key: 'MEMORY', label: 'MEMORY', min: 0, max: 20, step: 1 },
      { key: 'COPY', label: 'COPY', min: 0, max: 20, step: 1 },
      // Cancun (EIP-5656)
      { key: 'MCOPY', label: 'MCOPY', min: 0, max: 20, step: 1 },
      { key: 'MCOPY_WORD', label: 'MCOPY Word', min: 0, max: 20, step: 1 },
    ],
  },
  {
    name: 'Misc',
    color: '#6b7280', // gray - matches CATEGORY_COLORS.Misc
    parameters: [
      { key: 'KECCAK256', label: 'KECCAK256 Base', min: 0, max: 200, step: 5 },
      { key: 'KECCAK256_WORD', label: 'KECCAK256 Word', min: 0, max: 50, step: 1 },
    ],
  },
  {
    name: 'Precompiles (Fixed)',
    color: '#10b981', // emerald
    parameters: [
      { key: 'PC_ECREC', label: 'ECRECOVER', min: 0, max: 20000, step: 100 },
      { key: 'PC_BN254_ADD', label: 'BN254 Add', min: 0, max: 2000, step: 10 },
      { key: 'PC_BN254_MUL', label: 'BN254 Mul', min: 0, max: 30000, step: 500 },
      { key: 'PC_BLS12_G1ADD', label: 'BLS12 G1Add', min: 0, max: 5000, step: 25 },
      { key: 'PC_BLS12_G2ADD', label: 'BLS12 G2Add', min: 0, max: 5000, step: 25 },
      { key: 'PC_BLS12_MAP_FP_TO_G1', label: 'BLS12 MapFpToG1', min: 0, max: 30000, step: 500 },
      { key: 'PC_BLS12_MAP_FP2_TO_G2', label: 'BLS12 MapFp2ToG2', min: 0, max: 100000, step: 1000 },
      { key: 'PC_KZG_POINT_EVALUATION', label: 'KZG Point Eval', min: 0, max: 250000, step: 5000 },
      { key: 'PC_P256VERIFY', label: 'P256 Verify', min: 0, max: 20000, step: 100 },
    ],
  },
  {
    name: 'Precompiles (Variable)',
    color: '#059669', // emerald-600
    parameters: [
      { key: 'PC_SHA256_BASE', label: 'SHA256 Base', min: 0, max: 500, step: 5 },
      { key: 'PC_SHA256_PER_WORD', label: 'SHA256 /Word', min: 0, max: 100, step: 1 },
      { key: 'PC_RIPEMD160_BASE', label: 'RIPEMD160 Base', min: 0, max: 3000, step: 50 },
      { key: 'PC_RIPEMD160_PER_WORD', label: 'RIPEMD160 /Word', min: 0, max: 500, step: 10 },
      { key: 'PC_ID_BASE', label: 'Identity Base', min: 0, max: 100, step: 1 },
      { key: 'PC_ID_PER_WORD', label: 'Identity /Word', min: 0, max: 50, step: 1 },
      { key: 'PC_MODEXP_MIN_GAS', label: 'MODEXP Min Gas', min: 0, max: 2000, step: 10 },
      { key: 'PC_BN254_PAIRING_BASE', label: 'BN254 Pairing Base', min: 0, max: 200000, step: 5000 },
      { key: 'PC_BN254_PAIRING_PER_PAIR', label: 'BN254 Pairing /Pair', min: 0, max: 200000, step: 1000 },
      { key: 'PC_BLAKE2F_PER_ROUND', label: 'BLAKE2F /Round', min: 0, max: 20, step: 1 },
      { key: 'PC_BLS12_PAIRING_CHECK_BASE', label: 'BLS12 Pairing Base', min: 0, max: 200000, step: 5000 },
      { key: 'PC_BLS12_PAIRING_CHECK_PER_PAIR', label: 'BLS12 Pairing /Pair', min: 0, max: 200000, step: 1000 },
      { key: 'PC_BLS12_G1MSM_MUL_GAS', label: 'BLS12 G1MSM /Point', min: 0, max: 50000, step: 1000 },
      { key: 'PC_BLS12_G2MSM_MUL_GAS', label: 'BLS12 G2MSM /Point', min: 0, max: 100000, step: 1000 },
    ],
  },
  // NOTE: Intrinsic gas (TX_BASE, TX_CREATE, TX_DATA_ZERO, TX_DATA_NONZERO) cannot be
  // customized - it's calculated at the protocol level before EVM execution begins.
];

/**
 * Summary of gas usage (original or simulated)
 */
export interface BlockGasSummary {
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

/**
 * Transaction gas detail
 */
export interface TxGasDetail {
  gasUsed: number;
  intrinsicGas: number;
  executionGas: number;
  refundGas: number;
}

/**
 * Trace entry for transaction simulation
 */
export interface TraceEntry {
  pc: number;
  op: string;
  depth: number;
  originalGas: number;
  simulatedGas: number;
}

/**
 * Transaction simulation result (with optional trace)
 */
export interface TransactionSimulationResult {
  transactionHash: string;
  blockNumber: number;
  baseFork: string;
  customSchedule: GasSchedule;
  status: 'success' | 'failed';
  original: TxGasDetail;
  simulated: TxGasDetail;
  opcodeBreakdown: Record<string, OpcodeSummary>;
  trace?: TraceEntry[];
}
