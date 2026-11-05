import { useMemo } from 'react';
import { currentUtcDate } from '@/utils/time';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctStorageSlotStateByBlockDailyServiceListOptions,
  fctStorageSlotStateWithExpiryByBlockDailyServiceListOptions,
  fctStorageSlotTop100ByBytesServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctStorageSlotTop100ByBytes } from '@/api/types.gen';

/**
 * Key overhead per storage slot in geth's snapshot structure.
 * Each slot key = 1 (prefix) + 32 (account hash) + 32 (storage hash) = 65 bytes
 */
const SLOT_KEY_OVERHEAD_BYTES = 65;

/** Storage size of a row: value bytes plus the 65-byte key overhead per slot, as on the contract page */
export function storageSize(row: FctStorageSlotTop100ByBytes | null | undefined): number | undefined {
  if (!row || row.effective_bytes === undefined) return undefined;
  return (row.active_slots ?? 0) * SLOT_KEY_OVERHEAD_BYTES + row.effective_bytes;
}

/** Percentage of storage size an expiry policy removes, on the same size basis as the Size column */
export function expirySavings(
  base: FctStorageSlotTop100ByBytes,
  expiry: FctStorageSlotTop100ByBytes | null
): number | null {
  const baseSize = storageSize(base);
  const expirySize = storageSize(expiry);
  if (baseSize === undefined || expirySize === undefined || baseSize === 0) return null;
  return ((baseSize - expirySize) / baseSize) * 100;
}

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
  /**
   * Last day of slot-expiry data, set when it stops more than a day before the current state.
   * The expiry rows then describe older state than the base rows, so their savings are not comparable.
   */
  expiryEndDate: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that fetches the top 100 contracts by storage bytes.
 * Returns contracts grouped with base state and 1y/2y expiry policy data.
 */
export function useContractTop100Data(): UseContractTop100DataResult {
  const today = currentUtcDate();
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

  const latestBaseQuery = useQuery({
    ...fctStorageSlotStateByBlockDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: 1 },
    }),
  });

  const latestExpiryQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByBlockDailyServiceListOptions({
      query: {
        expiry_policy_eq: '12m',
        day_start_date_ne: today,
        order_by: 'day_start_date desc',
        page_size: 1,
      },
    }),
  });

  const latestBase = latestBaseQuery.data?.fct_storage_slot_state_by_block_daily?.[0]?.day_start_date;
  const latestExpiry = latestExpiryQuery.data?.fct_storage_slot_state_with_expiry_by_block_daily?.[0]?.day_start_date;
  const expiryEndDate =
    latestBase && latestExpiry && Date.parse(latestBase) - Date.parse(latestExpiry) > 86_400_000 ? latestExpiry : null;

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
    expiryEndDate,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
