import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctStorageSlotTop100ByBytesServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctStorageSlotTop100ByBytes } from '@/api/types.gen';

/** Grouped contract data with base state and expiry policy data */
export interface ContractTop100Item {
  /** Base contract data (null expiry_policy - current state) */
  contract: FctStorageSlotTop100ByBytes;
  /** 12-month expiry policy data */
  expiry12m: FctStorageSlotTop100ByBytes | null;
  /** 24-month expiry policy data */
  expiry24m: FctStorageSlotTop100ByBytes | null;
}

interface UseContractTop100DataResult {
  data: ContractTop100Item[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that fetches the top 100 contracts by storage bytes.
 * Returns contracts grouped with base state and 1y/2y expiry policy data.
 */
export function useContractTop100Data(): UseContractTop100DataResult {
  const query = useQuery({
    ...fctStorageSlotTop100ByBytesServiceListOptions({
      query: {
        rank_gte: 1,
        page_size: 10000,
        order_by: 'rank',
      },
    }),
    placeholderData: keepPreviousData,
  });

  const data = query.data?.fct_storage_slot_top_100_by_bytes ?? null;

  // Group data by contract address and include expiry policy data
  const groupedData = useMemo((): ContractTop100Item[] | null => {
    if (!data) return null;

    // Group rows by contract address
    const contractMap = new Map<
      string,
      {
        base: FctStorageSlotTop100ByBytes | null;
        expiry12m: FctStorageSlotTop100ByBytes | null;
        expiry24m: FctStorageSlotTop100ByBytes | null;
      }
    >();

    for (const row of data) {
      const address = row.contract_address;
      if (!address) continue;

      if (!contractMap.has(address)) {
        contractMap.set(address, { base: null, expiry12m: null, expiry24m: null });
      }

      const entry = contractMap.get(address)!;
      if (row.expiry_policy == null) {
        entry.base = row;
      } else if (row.expiry_policy === '12m') {
        entry.expiry12m = row;
      } else if (row.expiry_policy === '24m') {
        entry.expiry24m = row;
      }
    }

    // Convert to array, filter out entries without base data, and sort by rank
    const result: ContractTop100Item[] = [];
    for (const entry of contractMap.values()) {
      if (entry.base) {
        result.push({
          contract: entry.base,
          expiry12m: entry.expiry12m,
          expiry24m: entry.expiry24m,
        });
      }
    }

    // Sort by rank (ascending)
    result.sort((a, b) => (a.contract.rank ?? 0) - (b.contract.rank ?? 0));

    return result;
  }, [data]);

  return {
    data: groupedData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
