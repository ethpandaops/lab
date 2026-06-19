import { useMemo } from 'react';
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

/**
 * Fetches daily live storage slots owned by ERC20/ERC721 contracts
 * (fct_token_contract_storage_state_by_block_daily), keyed by day so the caller can align it with
 * the State Growth page's existing storage-leaves total rather than re-querying state size.
 */
export function useTokenStorageShare(): UseTokenStorageShareResult {
  const query = useQuery({
    ...fctTokenContractStorageStateByBlockDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        page_size: 10000,
      },
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
