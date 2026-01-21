/**
 * Props for the GasFlowDiagram component
 */
export interface GasFlowDiagramProps {
  /** Intrinsic gas (base tx cost). Null for failed transactions */
  intrinsicGas: number | null;
  /** EVM execution gas (opcode costs) */
  evmGas: number;
  /** Gas refund (storage cleanup) */
  gasRefund: number;
  /** Receipt gas (final charged amount) */
  receiptGas: number;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Show labels above values */
  showLabels?: boolean;
  /** Show the formula below the diagram */
  showFormula?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Gas type identifiers for tooltips and styling
 */
export type GasType = 'intrinsic' | 'evm' | 'refund' | 'receipt';

/**
 * Gas explanation content
 */
export interface GasExplanation {
  title: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * Gas explanations for each type
 */
export const GAS_EXPLANATIONS: Record<GasType, GasExplanation> = {
  intrinsic: {
    title: 'Intrinsic Gas',
    description:
      'Base transaction cost charged before execution. Includes: 21,000 base + calldata cost (4 gas per zero byte, 16 per non-zero) + access list cost. For failed transactions, this may be unavailable.',
    color: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
    },
  },
  evm: {
    title: 'EVM Execution',
    description:
      'Gas consumed by opcode execution during the transaction. This is what the flame graph visualizes - the cost of running smart contract code.',
    color: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/20',
    },
  },
  refund: {
    title: 'Gas Refund',
    description:
      'Gas returned for storage cleanup operations (SSTORE setting to zero). Capped at 20% of total gas per EIP-3529 to prevent refund abuse.',
    color: {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/20',
    },
  },
  receipt: {
    title: 'Receipt Gas',
    description:
      'Final gas charged to the user. Calculated as: Intrinsic + EVM Execution - Effective Refund. This is the value shown in block explorers.',
    color: {
      bg: 'bg-surface',
      text: 'text-foreground',
      border: 'border-border',
    },
  },
};
