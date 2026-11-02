import type { TxSummary } from '../SimulatePage.types';

export const SIM_TX_SORT_FIELDS = ['impact', 'delta', 'index', 'originalGas', 'simulatedGas', 'reverts'] as const;
export type SimTxSortField = (typeof SIM_TX_SORT_FIELDS)[number];

export const DEFAULT_SIM_TX_SORT: SimTxSortField = 'impact';
export const DEFAULT_SIM_TX_PAGE_SIZE = 25;

/** Filters for a simulated block's transactions; they combine with AND */
export interface SimTxFilters {
  /** Matches tx hash, an errored call's address, or an error message */
  q?: string;
  diverged?: boolean;
  statusChanged?: boolean;
  errors?: boolean;
  /** Outcome under the simulated schedule */
  status?: 'succeeded' | 'failed';
  /** Direction of the gas change */
  change?: 'up' | 'down' | 'none';
  gasMin?: number;
  gasMax?: number;
  /** Minimum absolute gas change, in percent */
  impactMin?: number;
}

export function hasStatusChange(tx: TxSummary): boolean {
  return tx.originalStatus !== tx.simulatedStatus;
}

export function hasCallErrors(tx: TxSummary): boolean {
  return (tx.originalErrors?.length ?? 0) > 0 || (tx.simulatedErrors?.length ?? 0) > 0 || !!tx.error;
}

function matchesSearch(tx: TxSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (tx.hash.toLowerCase().includes(q)) return true;
  if (tx.error?.toLowerCase().includes(q)) return true;
  return [...(tx.originalErrors ?? []), ...(tx.simulatedErrors ?? [])].some(
    e => e.address?.toLowerCase().includes(q) || e.error?.toLowerCase().includes(q)
  );
}

/** Apply filters to simulated transactions */
export function filterSimulationTransactions(transactions: TxSummary[], filters: SimTxFilters): TxSummary[] {
  return transactions.filter(tx => {
    if (filters.diverged && !tx.diverged) return false;
    if (filters.statusChanged && !hasStatusChange(tx)) return false;
    if (filters.errors && !hasCallErrors(tx)) return false;
    if (filters.status === 'succeeded' && tx.simulatedStatus !== 'success') return false;
    if (filters.status === 'failed' && tx.simulatedStatus !== 'failed') return false;
    const delta = tx.simulatedGas - tx.originalGas;
    if (filters.change === 'up' && delta <= 0) return false;
    if (filters.change === 'down' && delta >= 0) return false;
    if (filters.change === 'none' && delta !== 0) return false;
    if (filters.gasMin !== undefined && tx.originalGas < filters.gasMin) return false;
    if (filters.gasMax !== undefined && tx.originalGas > filters.gasMax) return false;
    if (filters.impactMin !== undefined && Math.abs(tx.deltaPercent) < filters.impactMin) return false;
    if (filters.q && !matchesSearch(tx, filters.q)) return false;
    return true;
  });
}

function getSortValue(tx: TxSummary, field: SimTxSortField): number {
  switch (field) {
    case 'impact':
      return Math.abs(tx.deltaPercent);
    case 'delta':
      return tx.simulatedGas - tx.originalGas;
    case 'index':
      return tx.index;
    case 'originalGas':
      return tx.originalGas;
    case 'simulatedGas':
      return tx.simulatedGas;
    case 'reverts':
      return tx.simulatedReverts;
  }
}

/** Sort simulated transactions; ties keep block order */
export function sortSimulationTransactions(
  transactions: TxSummary[],
  field: SimTxSortField,
  dir: 'asc' | 'desc'
): TxSummary[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...transactions].sort(
    (a, b) => (getSortValue(a, field) - getSortValue(b, field)) * sign || a.index - b.index
  );
}
