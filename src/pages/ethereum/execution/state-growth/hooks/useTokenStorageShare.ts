import { useMemo } from 'react';
import { currentUtcDate } from '@/utils/time';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctTokenContractStorageStateByBlockDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctTokenContractStorageStateByBlockDaily } from '@/api/types.gen';

/** Live storage slots owned by token contracts for a single day, split by standard. */
export interface TokenStorageDay {
  erc20: number;
  erc721: number;
}

/** Map of day_start_date ("YYYY-MM-DD") -> per-standard slot counts. */
export type TokenStorageByDay = Map<string, TokenStorageDay>;

interface UseTokenStorageShareResult {
  byDay: TokenStorageByDay;
  isLoading: boolean;
  error: Error | null;
}

function normalizeByDay(rows: FctTokenContractStorageStateByBlockDaily[]): TokenStorageByDay {
  const byDay: TokenStorageByDay = new Map();
  for (const row of rows) {
    if (!row.day_start_date) continue;
    const entry = byDay.get(row.day_start_date) ?? { erc20: 0, erc721: 0 };
    if (row.token_standard === 'erc20') entry.erc20 = row.active_slots ?? 0;
    else if (row.token_standard === 'erc721') entry.erc721 = row.active_slots ?? 0;
    byDay.set(row.day_start_date, entry);
  }
  return byDay;
}

/** Two rows (ERC20, ERC721) per day, so this covers the last week */
const TOKEN_STORAGE_ROWS = 14;

/**
 * Fetches the latest days of live storage slots owned by ERC20/ERC721 contracts
 * (fct_token_contract_storage_state_by_block_daily), keyed by day so the caller can align it with
 * the State Growth page's existing storage-leaves total rather than re-querying state size.
 */
export function useTokenStorageShare(): UseTokenStorageShareResult {
  const today = currentUtcDate();
  const query = useQuery({
    ...fctTokenContractStorageStateByBlockDailyServiceListOptions({
      // Newest days first; the card shows the latest day the state-size series also has
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: TOKEN_STORAGE_ROWS },
    }),
    placeholderData: keepPreviousData,
  });

  const byDay = useMemo(() => {
    const rows = query.data?.fct_token_contract_storage_state_by_block_daily;
    return rows ? normalizeByDay(rows) : new Map<string, TokenStorageDay>();
  }, [query.data]);

  return {
    byDay,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
