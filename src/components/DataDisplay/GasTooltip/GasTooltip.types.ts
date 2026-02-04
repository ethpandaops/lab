/**
 * Gas type identifiers
 */
export type GasType = 'intrinsic' | 'evm' | 'refund' | 'receipt' | 'self' | 'child' | 'cumulative';

/**
 * Context for gas explanations - affects the wording
 */
export type GasContext = 'block' | 'transaction' | 'call';

/**
 * Props for the GasTooltip component
 */
export interface GasTooltipProps {
  /** The type of gas to explain */
  type: GasType;
  /** Context affects the wording (block = aggregated, transaction = single tx, call = single call) */
  context?: GasContext;
  /** Custom content to override the default explanation */
  customContent?: React.ReactNode;
  /** Size of the info icon */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
  /** Cap percentage for refund tooltip (e.g., "20%" or "50%") - used for fork-aware display */
  capPercent?: string;
  /** Whether this is a contract creation transaction - affects intrinsic gas explanation */
  isContractCreation?: boolean;
}

/**
 * Gas explanation content
 */
export interface GasExplanation {
  title: string;
  description: string;
}

/**
 * Gas explanations for transaction context (default)
 */
const TRANSACTION_EXPLANATIONS: Record<GasType, GasExplanation> = {
  intrinsic: {
    title: 'Intrinsic Gas',
    description:
      'Base transaction cost charged before execution. Includes: 21,000 base + calldata cost (4 gas per zero byte, 16 per non-zero) + access list cost. For failed transactions, this may be unavailable.',
  },
  evm: {
    title: 'EVM Execution Gas',
    description:
      'Gas consumed by opcode execution during the transaction. This is what the flame graph visualizes - the cost of running smart contract code.',
  },
  refund: {
    title: 'Gas Refund',
    description:
      'Gas returned for storage cleanup operations (SSTORE setting to zero). Capped at 20% of total gas used.',
  },
  receipt: {
    title: 'Receipt Gas',
    description: 'Final gas charged to the user. Calculated as: Intrinsic + EVM Execution - Refund.',
  },
  self: {
    title: 'Gas',
    description:
      "Gas consumed directly by this call's opcodes, excluding any gas consumed by sub-calls. Useful for identifying which specific call is expensive.",
  },
  child: {
    title: 'Child Calls Gas',
    description:
      'Total gas consumed by all sub-calls made from this call. This is the cumulative gas minus the self gas.',
  },
  cumulative: {
    title: 'Cumulative Gas',
    description:
      'Total gas consumed by this call including all sub-calls. Represents the full cost of this call and everything it triggered.',
  },
};

/**
 * Gas explanations for block context (aggregated across all transactions)
 */
const BLOCK_EXPLANATIONS: Record<GasType, GasExplanation> = {
  intrinsic: {
    title: 'Total Intrinsic Gas',
    description:
      'Sum of intrinsic gas across all transactions in this block. Each transaction has a base cost (21,000) plus calldata and access list costs.',
  },
  evm: {
    title: 'Total EVM Execution Gas',
    description:
      'Sum of EVM execution gas across all transactions in this block. This represents the total cost of running smart contract code.',
  },
  refund: {
    title: 'Total Gas Refund',
    description:
      'Sum of gas refunds across all transactions in this block. Refunds are given for storage cleanup operations.',
  },
  receipt: {
    title: 'Total Gas Used',
    description: 'Total gas used by all transactions in this block. This is what counts toward the block gas limit.',
  },
  self: TRANSACTION_EXPLANATIONS.self,
  child: TRANSACTION_EXPLANATIONS.child,
  cumulative: TRANSACTION_EXPLANATIONS.cumulative,
};

/**
 * Gas explanations for call context
 */
const CALL_EXPLANATIONS: Record<GasType, GasExplanation> = {
  ...TRANSACTION_EXPLANATIONS,
  self: {
    title: 'Gas',
    description:
      "Gas consumed directly by this call's opcodes, excluding any gas used by sub-calls. Shows the direct cost of this specific call.",
  },
  child: {
    title: 'Child Calls Gas',
    description: 'Total gas consumed by all sub-calls made from this call. Calculated as: Cumulative - Gas.',
  },
  cumulative: {
    title: 'Cumulative Gas',
    description:
      'Total gas consumed by this call including all its sub-calls. Represents the full cost of this call and everything it triggered.',
  },
};

/**
 * Get gas explanations based on context
 */
export function getGasExplanations(context: GasContext = 'transaction'): Record<GasType, GasExplanation> {
  switch (context) {
    case 'block':
      return BLOCK_EXPLANATIONS;
    case 'call':
      return CALL_EXPLANATIONS;
    case 'transaction':
    default:
      return TRANSACTION_EXPLANATIONS;
  }
}

/**
 * @deprecated Use getGasExplanations(context) instead
 */
export const GAS_EXPLANATIONS = TRANSACTION_EXPLANATIONS;
