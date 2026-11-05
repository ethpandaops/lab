import { useMemo } from 'react';
import { currentUtcDate } from '@/utils/time';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctContractStorageStateByAddressDailyServiceListOptions,
  fctContractStorageStateWithExpiryByAddressDailyServiceListOptions,
  fctStorageSlotStateByAddressDailyServiceListOptions,
  fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctContractStorageStateWithExpiryByAddressDaily,
  FctStorageSlotStateWithExpiryByAddressDaily,
} from '@/api/types.gen';

/** Available expiry type options (slot vs contract based) */
export const EXPIRY_TYPES = ['slot', 'contract'] as const;
export type ExpiryType = (typeof EXPIRY_TYPES)[number];

/**
 * Key overhead per storage slot in geth's snapshot structure.
 * Each slot key = 1 (prefix) + 32 (account hash) + 32 (storage hash) = 65 bytes
 */
const SLOT_KEY_OVERHEAD_BYTES = 65;

/** Available expiry policy options */
export const EXPIRY_POLICIES = ['12m', '24m'] as const;
export type ExpiryPolicy = (typeof EXPIRY_POLICIES)[number];

/** Format date as YYYY-MM-DD */
function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Data for a specific expiry policy */
interface ExpiryPolicyData {
  activeSlots: number | null;
  effectiveBytes: number | null;
}

/** A single data point representing contract storage state on a given day */
export interface ContractStorageDataPoint {
  date: Date;
  dateLabel: string;
  /** Contract-level active slots without expiry policy */
  activeSlots: number | null;
  /** Contract-level effective bytes without expiry policy */
  effectiveBytes: number | null;
  /** Contract-based expiry data for each policy */
  expiryData: Record<ExpiryPolicy, ExpiryPolicyData>;
  /** Slot-level active slots without expiry */
  slotActiveSlots: number | null;
  /** Slot-level effective bytes without expiry */
  slotEffectiveBytes: number | null;
  /** Slot-based expiry data for each policy */
  slotExpiryData: Record<ExpiryPolicy, ExpiryPolicyData>;
}

interface UseContractStorageDataResult {
  data: ContractStorageDataPoint[] | null;
  latestData: ContractStorageDataPoint | null;
  isLoading: boolean;
  error: Error | null;
}

/** Query for the newest day in a whole table, so a series isn't carried past where its table stops */
const TABLE_END_QUERY = {
  address_like: '0x%',
  order_by: 'day_start_date desc',
  page_size: 1,
};

/**
 * Hook that fetches daily storage data for a specific contract address.
 * Uses contract-level endpoints for current state and expiry policies.
 */
export function useContractStorageData(address: string): UseContractStorageDataResult {
  // Normalize address to lowercase for API requests
  const normalizedAddress = address.toLowerCase();
  const today = currentUtcDate();
  const tableEndQuery = { ...TABLE_END_QUERY, day_start_date_ne: today };

  // Fetch current state for this address (no expiry)
  const currentStateQuery = useQuery({
    ...fctContractStorageStateByAddressDailyServiceListOptions({
      query: {
        address_eq: normalizedAddress,
        day_start_date_ne: today,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Contract-based expiry queries (12m, 24m)
  const expiry12mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: normalizedAddress,
        expiry_policy_eq: '12m',
        day_start_date_ne: today,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const expiry24mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: normalizedAddress,
        expiry_policy_eq: '24m',
        day_start_date_ne: today,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Slot-level current state query (NOT extrapolated)
  const slotCurrentStateQuery = useQuery({
    ...fctStorageSlotStateByAddressDailyServiceListOptions({
      query: {
        address_eq: normalizedAddress,
        day_start_date_ne: today,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Slot-level expiry queries (NOT extrapolated)
  const slotExpiry12mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: normalizedAddress,
        expiry_policy_eq: '12m',
        day_start_date_ne: today,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const slotExpiry24mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: normalizedAddress,
        expiry_policy_eq: '24m',
        day_start_date_ne: today,
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Newest day in each table. Rows are only written on days a contract changes, so a contract's own
  // rows can't tell a quiet contract from a table that stopped updating.
  const contractCurrentEndQuery = useQuery({
    ...fctContractStorageStateByAddressDailyServiceListOptions({ query: tableEndQuery }),
    select: res => res.fct_contract_storage_state_by_address_daily?.[0]?.day_start_date ?? null,
  });
  const contractExpiryEndQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({ query: tableEndQuery }),
    select: res => res.fct_contract_storage_state_with_expiry_by_address_daily?.[0]?.day_start_date ?? null,
  });
  const slotCurrentEndQuery = useQuery({
    ...fctStorageSlotStateByAddressDailyServiceListOptions({ query: tableEndQuery }),
    select: res => res.fct_storage_slot_state_by_address_daily?.[0]?.day_start_date ?? null,
  });
  const slotExpiryEndQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({ query: tableEndQuery }),
    select: res => res.fct_storage_slot_state_with_expiry_by_address_daily?.[0]?.day_start_date ?? null,
  });

  // Combine and normalize the data
  const processedData = useMemo((): ContractStorageDataPoint[] | null => {
    const currentData = currentStateQuery.data?.fct_contract_storage_state_by_address_daily;
    const expiry12mData = expiry12mQuery.data?.fct_contract_storage_state_with_expiry_by_address_daily;
    const expiry24mData = expiry24mQuery.data?.fct_contract_storage_state_with_expiry_by_address_daily;
    const slotCurrentData = slotCurrentStateQuery.data?.fct_storage_slot_state_by_address_daily;
    const slotExpiry12mData = slotExpiry12mQuery.data?.fct_storage_slot_state_with_expiry_by_address_daily;
    const slotExpiry24mData = slotExpiry24mQuery.data?.fct_storage_slot_state_with_expiry_by_address_daily;

    if (!currentData || currentData.length === 0) {
      return null;
    }

    // === STEP 1: Create lookup maps for all datasets ===

    // Helper to get min/max dates from a map
    const getDateRange = (map: Map<string, unknown>): { min: string; max: string } | null => {
      const dates = Array.from(map.keys()).sort();
      if (dates.length === 0) return null;
      return { min: dates[0], max: dates[dates.length - 1] };
    };

    // Contract current state
    const contractCurrentMap = new Map<string, { slots: number; bytes: number }>();
    currentData.forEach(item => {
      if (item.day_start_date) {
        const slots = item.active_slots ?? 0;
        const valueBytes = item.effective_bytes ?? 0;
        contractCurrentMap.set(item.day_start_date, {
          slots,
          bytes: slots * SLOT_KEY_OVERHEAD_BYTES + valueBytes,
        });
      }
    });

    // Contract expiry maps
    const contractExpiryMaps: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '12m': new Map(),
      '24m': new Map(),
    };
    const contractExpiryData: Record<ExpiryPolicy, FctContractStorageStateWithExpiryByAddressDaily[] | undefined> = {
      '12m': expiry12mData,
      '24m': expiry24mData,
    };
    for (const policy of EXPIRY_POLICIES) {
      contractExpiryData[policy]?.forEach(item => {
        if (item.day_start_date) {
          const slots = item.active_slots ?? 0;
          const valueBytes = item.effective_bytes ?? 0;
          contractExpiryMaps[policy].set(item.day_start_date, {
            slots,
            bytes: slots * SLOT_KEY_OVERHEAD_BYTES + valueBytes,
          });
        }
      });
    }

    // Slot current state
    const slotCurrentMap = new Map<string, { slots: number; bytes: number }>();
    slotCurrentData?.forEach(item => {
      if (item.day_start_date) {
        const slots = item.active_slots ?? 0;
        const valueBytes = item.effective_bytes ?? 0;
        slotCurrentMap.set(item.day_start_date, {
          slots,
          bytes: slots * SLOT_KEY_OVERHEAD_BYTES + valueBytes,
        });
      }
    });

    // Slot expiry maps
    const slotExpiryMaps: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '12m': new Map(),
      '24m': new Map(),
    };
    const slotExpiryData: Record<ExpiryPolicy, FctStorageSlotStateWithExpiryByAddressDaily[] | undefined> = {
      '12m': slotExpiry12mData,
      '24m': slotExpiry24mData,
    };
    for (const policy of EXPIRY_POLICIES) {
      slotExpiryData[policy]?.forEach(item => {
        if (item.day_start_date) {
          const slots = item.active_slots ?? 0;
          const valueBytes = item.effective_bytes ?? 0;
          slotExpiryMaps[policy].set(item.day_start_date, {
            slots,
            bytes: slots * SLOT_KEY_OVERHEAD_BYTES + valueBytes,
          });
        }
      });
    }

    // === STEP 2: Determine date ranges ===
    const contractCurrentRange = getDateRange(contractCurrentMap);
    const slotCurrentRange = getDateRange(slotCurrentMap);

    if (!contractCurrentRange) return null;

    // Get ranges for all expiry datasets
    const contractExpiryRanges: Record<ExpiryPolicy, { min: string; max: string } | null> = {
      '12m': getDateRange(contractExpiryMaps['12m']),
      '24m': getDateRange(contractExpiryMaps['24m']),
    };
    const slotExpiryRanges: Record<ExpiryPolicy, { min: string; max: string } | null> = {
      '12m': getDateRange(slotExpiryMaps['12m']),
      '24m': getDateRange(slotExpiryMaps['24m']),
    };

    // Calculate global max date across ALL datasets (current + expiry for both contract and slot)
    // This ensures we display data until the latest available date from any source
    const allMaxDates: string[] = [contractCurrentRange.max];
    if (slotCurrentRange) allMaxDates.push(slotCurrentRange.max);
    for (const policy of EXPIRY_POLICIES) {
      if (contractExpiryRanges[policy]) allMaxDates.push(contractExpiryRanges[policy]!.max);
      if (slotExpiryRanges[policy]) allMaxDates.push(slotExpiryRanges[policy]!.max);
    }
    const globalMaxDateStr = allMaxDates.sort().pop()!;
    const globalMaxDate = new Date(globalMaxDateStr);

    // A series is carried forward to the chart's last date, but never past the last day its table has
    const fillEnd = (tableEnd: string | null | undefined): string =>
      tableEnd && tableEnd < globalMaxDateStr ? tableEnd : globalMaxDateStr;
    const contractCurrentEnd = fillEnd(contractCurrentEndQuery.data);
    const contractExpiryEnd = fillEnd(contractExpiryEndQuery.data);
    const slotCurrentEnd = fillEnd(slotCurrentEndQuery.data);
    const slotExpiryEnd = fillEnd(slotExpiryEndQuery.data);

    // === STEP 3: Helper to fill gaps in a dataset within its own min/max range ===
    const fillGaps = (
      dataMap: Map<string, { slots: number; bytes: number }>,
      minDate: string,
      maxDate: string
    ): Map<string, { slots: number; bytes: number }> => {
      const filled = new Map<string, { slots: number; bytes: number }>();
      const start = new Date(minDate);
      const end = new Date(maxDate);
      let lastValue = { slots: 0, bytes: 0 };

      const current = new Date(start);
      while (current <= end) {
        const dateStr = formatDateStr(current);
        const existing = dataMap.get(dateStr);
        if (existing) {
          lastValue = existing;
        }
        filled.set(dateStr, lastValue);
        current.setUTCDate(current.getUTCDate() + 1);
      }
      return filled;
    };

    // === STEP 4: Fill gaps for each dataset ===
    // Each series is forward-filled from its first row to the global max date, capped at its table's end

    // Contract current
    const filledContractCurrent = fillGaps(contractCurrentMap, contractCurrentRange.min, contractCurrentEnd);

    // Contract expiry
    const filledContractExpiry: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '12m': new Map(),
      '24m': new Map(),
    };
    for (const policy of EXPIRY_POLICIES) {
      const range = getDateRange(contractExpiryMaps[policy]);
      if (range) {
        filledContractExpiry[policy] = fillGaps(contractExpiryMaps[policy], range.min, contractExpiryEnd);
      }
    }

    // Slot current
    let filledSlotCurrent: Map<string, { slots: number; bytes: number }> | null = null;
    if (slotCurrentRange) {
      filledSlotCurrent = fillGaps(slotCurrentMap, slotCurrentRange.min, slotCurrentEnd);
    }

    // Slot expiry
    const filledSlotExpiry: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '12m': new Map(),
      '24m': new Map(),
    };
    for (const policy of EXPIRY_POLICIES) {
      const range = getDateRange(slotExpiryMaps[policy]);
      if (range) {
        filledSlotExpiry[policy] = fillGaps(slotExpiryMaps[policy], range.min, slotExpiryEnd);
      }
    }

    // === STEP 5: Build the date range for output ===
    const startDate = new Date(contractCurrentRange.min);

    // Generate all dates from start to global max date
    const allDates: string[] = [];
    const current = new Date(startDate);
    while (current <= globalMaxDate) {
      allDates.push(formatDateStr(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // === STEP 6: Build final result ===
    const result: ContractStorageDataPoint[] = allDates.map(dateStr => {
      const date = new Date(dateStr);

      // Get contract current (forward-filled to global max)
      const contractCurrent = filledContractCurrent.get(dateStr) ?? null;

      // Get contract expiry data for each policy (forward-filled to global max)
      const contractExpiry: Record<ExpiryPolicy, ExpiryPolicyData> = {
        '12m': { activeSlots: null, effectiveBytes: null },
        '24m': { activeSlots: null, effectiveBytes: null },
      };
      for (const policy of EXPIRY_POLICIES) {
        const val = filledContractExpiry[policy].get(dateStr);
        if (val) {
          contractExpiry[policy] = { activeSlots: val.slots, effectiveBytes: val.bytes };
        }
      }

      // Get slot current (forward-filled to global max)
      const slotCurrent = filledSlotCurrent?.get(dateStr) ?? null;

      // Get slot expiry data for each policy (forward-filled to global max)
      const slotExpiry: Record<ExpiryPolicy, ExpiryPolicyData> = {
        '12m': { activeSlots: null, effectiveBytes: null },
        '24m': { activeSlots: null, effectiveBytes: null },
      };
      for (const policy of EXPIRY_POLICIES) {
        const val = filledSlotExpiry[policy].get(dateStr);
        if (val) {
          slotExpiry[policy] = { activeSlots: val.slots, effectiveBytes: val.bytes };
        }
      }

      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        activeSlots: contractCurrent?.slots ?? null,
        effectiveBytes: contractCurrent?.bytes ?? null,
        expiryData: contractExpiry,
        slotActiveSlots: slotCurrent?.slots ?? null,
        slotEffectiveBytes: slotCurrent?.bytes ?? null,
        slotExpiryData: slotExpiry,
      };
    });

    return result;
  }, [
    currentStateQuery.data,
    expiry12mQuery.data,
    expiry24mQuery.data,
    slotCurrentStateQuery.data,
    slotExpiry12mQuery.data,
    slotExpiry24mQuery.data,
    contractCurrentEndQuery.data,
    contractExpiryEndQuery.data,
    slotCurrentEndQuery.data,
    slotExpiryEndQuery.data,
  ]);

  const latestData = useMemo(() => {
    if (!processedData || processedData.length === 0) return null;
    return processedData[processedData.length - 1];
  }, [processedData]);

  const isLoading =
    currentStateQuery.isLoading ||
    expiry12mQuery.isLoading ||
    expiry24mQuery.isLoading ||
    slotCurrentStateQuery.isLoading ||
    slotExpiry12mQuery.isLoading ||
    slotExpiry24mQuery.isLoading ||
    contractCurrentEndQuery.isLoading ||
    contractExpiryEndQuery.isLoading ||
    slotCurrentEndQuery.isLoading ||
    slotExpiryEndQuery.isLoading;

  const error = (currentStateQuery.error ||
    expiry12mQuery.error ||
    expiry24mQuery.error ||
    slotCurrentStateQuery.error ||
    slotExpiry12mQuery.error ||
    slotExpiry24mQuery.error) as Error | null;

  return {
    data: processedData,
    latestData,
    isLoading,
    error,
  };
}
