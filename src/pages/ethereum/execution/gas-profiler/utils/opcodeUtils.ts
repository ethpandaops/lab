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

  // Misc (0x20)
  SHA3: 'Misc',
  KECCAK256: 'Misc', // Alias for SHA3

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
  Math: '#f59e0b', // amber
  Comparisons: '#8b5cf6', // purple
  Logic: '#06b6d4', // cyan
  'Bit Ops': '#14b8a6', // teal
  Misc: '#6b7280', // gray
  'Ethereum State': '#3b82f6', // blue
  Pop: '#a855f7', // violet
  Memory: '#22c55e', // green
  Storage: '#ef4444', // red
  Jump: '#ec4899', // pink
  'Transient Storage': '#f97316', // orange
  Push: '#64748b', // slate
  Dup: '#78716c', // stone
  Swap: '#84cc16', // lime
  Log: '#eab308', // yellow
  Contract: '#0ea5e9', // sky
  Other: '#9ca3af', // gray-400
};

/**
 * Call type colors for charts
 */
export const CALL_TYPE_COLORS: Record<string, string> = {
  CALL: '#3b82f6',
  STATICCALL: '#06b6d4',
  DELEGATECALL: '#8b5cf6',
  CREATE: '#f59e0b',
  CREATE2: '#f97316',
  CALLCODE: '#ec4899',
};

/**
 * Get category for an opcode
 */
export function getOpcodeCategory(opcode: string): string {
  // Direct lookup first
  if (OPCODE_CATEGORIES[opcode]) return OPCODE_CATEGORIES[opcode];

  // Push opcodes (PUSH0-PUSH32)
  if (opcode.startsWith('PUSH')) return 'Push';

  // Dup opcodes (DUP1-DUP16)
  if (opcode.startsWith('DUP')) return 'Dup';

  // Swap opcodes (SWAP1-SWAP16)
  if (opcode.startsWith('SWAP')) return 'Swap';

  // Log opcodes (fallback for any LOG variants)
  if (opcode.startsWith('LOG')) return 'Log';

  return 'Other';
}

/**
 * Hex to Tailwind class mapping for FlameGraph compatibility
 */
const HEX_TO_TAILWIND: Record<string, { bg: string; hover: string }> = {
  '#f59e0b': { bg: 'bg-amber-500', hover: 'hover:bg-amber-400' },
  '#8b5cf6': { bg: 'bg-violet-500', hover: 'hover:bg-violet-400' },
  '#06b6d4': { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-400' },
  '#14b8a6': { bg: 'bg-teal-500', hover: 'hover:bg-teal-400' },
  '#6b7280': { bg: 'bg-gray-500', hover: 'hover:bg-gray-400' },
  '#3b82f6': { bg: 'bg-blue-500', hover: 'hover:bg-blue-400' },
  '#a855f7': { bg: 'bg-purple-500', hover: 'hover:bg-purple-400' },
  '#22c55e': { bg: 'bg-green-500', hover: 'hover:bg-green-400' },
  '#ef4444': { bg: 'bg-red-500', hover: 'hover:bg-red-400' },
  '#ec4899': { bg: 'bg-pink-500', hover: 'hover:bg-pink-400' },
  '#f97316': { bg: 'bg-orange-500', hover: 'hover:bg-orange-400' },
  '#64748b': { bg: 'bg-slate-500', hover: 'hover:bg-slate-400' },
  '#78716c': { bg: 'bg-stone-500', hover: 'hover:bg-stone-400' },
  '#84cc16': { bg: 'bg-lime-500', hover: 'hover:bg-lime-400' },
  '#eab308': { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-400' },
  '#0ea5e9': { bg: 'bg-sky-500', hover: 'hover:bg-sky-400' },
  '#9ca3af': { bg: 'bg-gray-400', hover: 'hover:bg-gray-300' },
};

/**
 * FlameGraph color map for call types (derived from CALL_TYPE_COLORS)
 */
export const FLAME_GRAPH_CALL_TYPE_COLORS: Record<string, { bg: string; hover: string }> = Object.fromEntries(
  Object.entries(CALL_TYPE_COLORS).map(([key, hex]) => [
    key,
    HEX_TO_TAILWIND[hex] ?? { bg: 'bg-gray-500', hover: 'hover:bg-gray-400' },
  ])
);

/**
 * FlameGraph color map for opcode categories (derived from CATEGORY_COLORS)
 */
export const FLAME_GRAPH_CATEGORY_COLORS: Record<string, { bg: string; hover: string }> = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).map(([key, hex]) => [
    key,
    HEX_TO_TAILWIND[hex] ?? { bg: 'bg-gray-500', hover: 'hover:bg-gray-400' },
  ])
);

/**
 * Combined FlameGraph color map for call types + opcode categories
 */
export const FLAME_GRAPH_COMBINED_COLORS: Record<string, { bg: string; hover: string }> = {
  ...FLAME_GRAPH_CALL_TYPE_COLORS,
  ...FLAME_GRAPH_CATEGORY_COLORS,
};
