/**
 * Contract data for the interactions table
 */
export interface ContractInteractionItem {
  address: string;
  name: string | null;
  gas: number;
  callCount: number;
  callTypes: string[];
  /** Nested implementation contracts (for proxy -> implementation relationships) */
  implementations?: ContractInteractionItem[];
  /** Whether this is an implementation contract (delegated) */
  isImplementation?: boolean;
}

export interface ContractInteractionsTableProps {
  /** Contract data to display */
  contracts: ContractInteractionItem[];
  /** Total gas for percentage calculations */
  totalGas: number;
  /** Callback when a contract row is clicked */
  onContractClick?: (contract: ContractInteractionItem) => void;
  /** Label for the percentage column (e.g., "% of Block", "% of EVM") */
  percentLabel?: string;
  /** Whether to show implementations as expandable rows */
  showImplementations?: boolean;
  /** Initial number of visible rows */
  initialVisibleCount?: number;
}
