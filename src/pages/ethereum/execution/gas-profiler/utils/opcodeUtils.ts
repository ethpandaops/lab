import { getDataVizColors } from '@/utils/dataVizColors';

const { DATA_COLORS } = getDataVizColors();

/**
 * Opcode category mapping based on EVM opcode semantics
 */
export const OPCODE_CATEGORIES: Record<string, string> = {
  // Math (0x01-0x0B)
  ADD: 'Math',
  MUL: 'Math',
  SUB: 'Math',
  DIV: 'Math',
  SDIV: 'Math',
  MOD: 'Math',
  SMOD: 'Math',
  ADDMOD: 'Math',
  MULMOD: 'Math',
  EXP: 'Math',
  SIGNEXTEND: 'Math',

  // Comparisons (0x10-0x15)
  LT: 'Comparisons',
  GT: 'Comparisons',
  SLT: 'Comparisons',
  SGT: 'Comparisons',
  EQ: 'Comparisons',
  ISZERO: 'Comparisons',

  // Logic (0x16-0x19)
  AND: 'Logic',
  OR: 'Logic',
  XOR: 'Logic',
  NOT: 'Logic',

  // Bit Ops (0x1A-0x1D)
  BYTE: 'Bit Ops',
  SHL: 'Bit Ops',
  SHR: 'Bit Ops',
  SAR: 'Bit Ops',
  CLZ: 'Bit Ops', // Count Leading Zeros

  // Hashing (0x20)
  SHA3: 'Hashing',
  KECCAK256: 'Hashing', // Alias for SHA3

  // Ethereum State (0x30-0x48)
  ADDRESS: 'Ethereum State',
  BALANCE: 'Ethereum State',
  ORIGIN: 'Ethereum State',
  CALLER: 'Ethereum State',
  CALLVALUE: 'Ethereum State',
  CALLDATALOAD: 'Ethereum State',
  CALLDATASIZE: 'Ethereum State',
  CALLDATACOPY: 'Ethereum State',
  CODESIZE: 'Ethereum State',
  CODECOPY: 'Ethereum State',
  GASPRICE: 'Ethereum State',
  EXTCODESIZE: 'Ethereum State',
  EXTCODECOPY: 'Ethereum State',
  RETURNDATASIZE: 'Ethereum State',
  RETURNDATACOPY: 'Ethereum State',
  EXTCODEHASH: 'Ethereum State',
  BLOCKHASH: 'Ethereum State',
  COINBASE: 'Ethereum State',
  TIMESTAMP: 'Ethereum State',
  NUMBER: 'Ethereum State',
  PREVRANDAO: 'Ethereum State',
  DIFFICULTY: 'Ethereum State', // Legacy name for PREVRANDAO
  GASLIMIT: 'Ethereum State',
  CHAINID: 'Ethereum State',
  SELFBALANCE: 'Ethereum State',
  BASEFEE: 'Ethereum State',
  BLOBHASH: 'Ethereum State',
  BLOBBASEFEE: 'Ethereum State',

  // Pop (0x50)
  POP: 'Pop',

  // Memory (0x51-0x53)
  MLOAD: 'Memory',
  MSTORE: 'Memory',
  MSTORE8: 'Memory',
  MSIZE: 'Memory',
  MCOPY: 'Memory',

  // Storage (0x54-0x55)
  SLOAD: 'Storage',
  SSTORE: 'Storage',

  // Jump (0x56-0x5B)
  JUMP: 'Jump',
  JUMPI: 'Jump',
  PC: 'Jump',
  MSIZE_LEGACY: 'Jump', // 0x59
  GAS: 'Jump', // 0x5A
  JUMPDEST: 'Jump',

  // Transient Storage (0x5C-0x5D)
  TLOAD: 'Transient Storage',
  TSTORE: 'Transient Storage',

  // Log (0xA0-0xA4)
  LOG0: 'Log',
  LOG1: 'Log',
  LOG2: 'Log',
  LOG3: 'Log',
  LOG4: 'Log',

  // Contract (0xF0-0xFF)
  CREATE: 'Contract',
  CALL: 'Contract',
  CALLCODE: 'Contract',
  RETURN: 'Contract',
  DELEGATECALL: 'Contract',
  CREATE2: 'Contract',
  STATICCALL: 'Contract',
  REVERT: 'Contract',
  INVALID: 'Contract',
  SELFDESTRUCT: 'Contract',
  STOP: 'Contract',
};

/**
 * Category colors for charts
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Math: DATA_COLORS.amber,
  Comparisons: DATA_COLORS.violet,
  Logic: DATA_COLORS.cyan,
  'Bit Ops': DATA_COLORS.teal,
  Hashing: DATA_COLORS.indigo,
  Misc: DATA_COLORS.slate,
  'Ethereum State': DATA_COLORS.blue,
  Pop: DATA_COLORS.purple,
  Memory: DATA_COLORS.green,
  Storage: DATA_COLORS.red,
  Jump: DATA_COLORS.pink,
  'Transient Storage': DATA_COLORS.orange,
  Push: DATA_COLORS.slate,
  Dup: '#78716c', // stone
  Swap: DATA_COLORS.lime,
  Log: DATA_COLORS.yellow,
  Contract: DATA_COLORS.sky,
  'Precompiles (Fixed)': DATA_COLORS.emerald,
  'Precompiles (Variable)': DATA_COLORS.emerald,
  Precompiles: DATA_COLORS.emerald,
  'Intrinsic Gas': DATA_COLORS.fuchsia,
  Other: DATA_COLORS.slate,
};

/**
 * Call type colors for charts
 */
export const CALL_TYPE_COLORS: Record<string, string> = {
  CALL: DATA_COLORS.blue,
  STATICCALL: DATA_COLORS.cyan,
  DELEGATECALL: DATA_COLORS.violet,
  CREATE: DATA_COLORS.amber,
  CREATE2: DATA_COLORS.orange,
  CALLCODE: DATA_COLORS.pink,
};

/**
 * Determine if a gas schedule item is a parameter (modifier/component)
 * vs an actual EVM opcode.
 *
 * Parameters are cost components like SLOAD_COLD, CREATE_DATA, CALL_VALUE_XFER
 * Opcodes are actual EVM instructions like SLOAD, CREATE, CALL
 */
export function isGasParameter(name: string): boolean {
  // Known parameter suffixes (cold/warm access, data costs, special modifiers)
  const parameterSuffixes = [
    '_COLD',
    '_WARM',
    '_SET',
    '_RESET',
    '_CLEAR',
    '_DATA',
    '_WORD',
    '_BYTE',
    '_TOPIC',
    '_XFER',
    '_NEW_ACCOUNT',
    '_BY_SELFDESTRUCT',
  ];

  // Check for parameter suffixes
  if (parameterSuffixes.some(suffix => name.endsWith(suffix))) {
    return true;
  }

  // Precompile gas parameters (PC_SHA256_BASE, PC_ECREC, etc.)
  if (name.startsWith('PC_')) {
    return true;
  }

  // Intrinsic gas parameters (TX_BASE, TX_DATA_ZERO, etc.)
  if (name.startsWith('TX_')) {
    return true;
  }

  // Known standalone parameters (not opcodes)
  const standaloneParameters = [
    'MEMORY', // Memory expansion cost
    'COPY', // Per-word copy cost
    'INIT_CODE_WORD', // Per-word init code cost
    'REFUND_SSTORE_CLEARS', // Refund amount
  ];

  if (standaloneParameters.includes(name)) {
    return true;
  }

  return false;
}

/**
 * Get category for an opcode or gas parameter
 *
 * Handles both opcodes (SLOAD, CALL) and gas parameters (SLOAD_COLD, CALL_VALUE_XFER)
 */
export function getOpcodeCategory(opcode: string): string {
  // Direct lookup first
  if (OPCODE_CATEGORIES[opcode]) return OPCODE_CATEGORIES[opcode];

  // Intrinsic gas entries (TX_BASE, TX_DATA_ZERO, etc.)
  if (opcode.startsWith('TX_')) return 'Intrinsic Gas';

  // Precompile gas entries (PC_SHA256, PC_ECREC, etc.)
  if (opcode.startsWith('PC_')) return 'Precompiles';

  // Push opcodes (PUSH0-PUSH32)
  if (opcode.startsWith('PUSH')) return 'Push';

  // Dup opcodes (DUP1-DUP16)
  if (opcode.startsWith('DUP')) return 'Dup';

  // Swap opcodes (SWAP1-SWAP16)
  if (opcode.startsWith('SWAP')) return 'Swap';

  // Log opcodes and gas params (LOG0-4, LOG_DATA, LOG_TOPIC)
  if (opcode.startsWith('LOG')) return 'Log';

  // Storage gas parameters (SLOAD_COLD, SLOAD_WARM, SSTORE_SET, SSTORE_RESET)
  if (opcode.startsWith('SLOAD') || opcode.startsWith('SSTORE')) return 'Storage';

  // Transient storage gas parameters (TLOAD, TSTORE)
  if (opcode.startsWith('TLOAD') || opcode.startsWith('TSTORE')) return 'Transient Storage';

  // Call gas parameters (CALL_COLD, CALL_NEW_ACCOUNT, CALL_VALUE_XFER)
  if (opcode.startsWith('CALL')) return 'Contract';

  // Contract creation parameters (CREATE_BY_SELFDESTRUCT, INIT_CODE_WORD)
  if (opcode.startsWith('CREATE') || opcode === 'INIT_CODE_WORD') return 'Contract';

  // Math parameters (EXP_BYTE)
  if (opcode.startsWith('EXP')) return 'Math';

  // Hashing parameters (KECCAK256_WORD)
  if (opcode.startsWith('KECCAK')) return 'Hashing';

  // Memory parameters (MEMORY, COPY, MCOPY_WORD)
  if (opcode === 'MEMORY' || opcode === 'COPY' || opcode.startsWith('MCOPY')) return 'Memory';

  return 'Other';
}

/**
 * Hex to Tailwind class mapping for FlameGraph compatibility
 */
const HEX_TO_TAILWIND: Record<string, { bg: string; hover: string }> = {
  [DATA_COLORS.amber]: { bg: 'bg-data-amber', hover: 'hover:bg-data-amber/80' },
  [DATA_COLORS.indigo]: { bg: 'bg-data-indigo', hover: 'hover:bg-data-indigo/80' },
  [DATA_COLORS.violet]: { bg: 'bg-data-violet', hover: 'hover:bg-data-violet/80' },
  [DATA_COLORS.cyan]: { bg: 'bg-data-cyan', hover: 'hover:bg-data-cyan/80' },
  [DATA_COLORS.teal]: { bg: 'bg-data-teal', hover: 'hover:bg-data-teal/80' },
  [DATA_COLORS.blue]: { bg: 'bg-data-blue', hover: 'hover:bg-data-blue/80' },
  [DATA_COLORS.purple]: { bg: 'bg-data-purple', hover: 'hover:bg-data-purple/80' },
  [DATA_COLORS.green]: { bg: 'bg-data-green', hover: 'hover:bg-data-green/80' },
  [DATA_COLORS.red]: { bg: 'bg-data-red', hover: 'hover:bg-data-red/80' },
  [DATA_COLORS.pink]: { bg: 'bg-data-pink', hover: 'hover:bg-data-pink/80' },
  [DATA_COLORS.orange]: { bg: 'bg-data-orange', hover: 'hover:bg-data-orange/80' },
  [DATA_COLORS.slate]: { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
  '#78716c': { bg: 'bg-stone-500', hover: 'hover:bg-stone-400' },
  [DATA_COLORS.lime]: { bg: 'bg-data-lime', hover: 'hover:bg-data-lime/80' },
  [DATA_COLORS.yellow]: { bg: 'bg-data-yellow', hover: 'hover:bg-data-yellow/80' },
  [DATA_COLORS.sky]: { bg: 'bg-data-sky', hover: 'hover:bg-data-sky/80' },
  [DATA_COLORS.emerald]: { bg: 'bg-data-emerald', hover: 'hover:bg-data-emerald/80' },
  [DATA_COLORS.fuchsia]: { bg: 'bg-data-fuchsia', hover: 'hover:bg-data-fuchsia/80' },
};

/**
 * FlameGraph color map for call types (derived from CALL_TYPE_COLORS)
 */
export const FLAME_GRAPH_CALL_TYPE_COLORS: Record<string, { bg: string; hover: string }> = Object.fromEntries(
  Object.entries(CALL_TYPE_COLORS).map(([key, hex]) => [
    key,
    HEX_TO_TAILWIND[hex] ?? { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
  ])
);

/**
 * FlameGraph color map for opcode categories (derived from CATEGORY_COLORS)
 */
export const FLAME_GRAPH_CATEGORY_COLORS: Record<string, { bg: string; hover: string }> = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).map(([key, hex]) => [
    key,
    HEX_TO_TAILWIND[hex] ?? { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
  ])
);

/**
 * Combined FlameGraph color map for call types + opcode categories
 */
export const FLAME_GRAPH_COMBINED_COLORS: Record<string, { bg: string; hover: string }> = {
  ...FLAME_GRAPH_CALL_TYPE_COLORS,
  ...FLAME_GRAPH_CATEGORY_COLORS,
};
