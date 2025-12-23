import { useMemo } from 'react';
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

/** Available expiry policy options */
export const EXPIRY_POLICIES = ['6m', '12m', '18m', '24m'] as const;
export type ExpiryPolicy = (typeof EXPIRY_POLICIES)[number];

/** Policy duration in months */
const POLICY_MONTHS: Record<ExpiryPolicy, number> = {
  '6m': 6,
  '12m': 12,
  '18m': 18,
  '24m': 24,
};

/** Add months to a date */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

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

interface UseContractStorageDataOptions {
  /** Whether to extrapolate data to today (default: false) */
  extrapolate?: boolean;
}

/**
 * Hook that fetches daily storage data for a specific contract address.
 * Uses contract-level endpoints for current state and expiry policies.
 */
export function useContractStorageData(
  address: string,
  options: UseContractStorageDataOptions = {}
): UseContractStorageDataResult {
  const { extrapolate = false } = options;
  // Fetch current state for this address (no expiry)
  const currentStateQuery = useQuery({
    ...fctContractStorageStateByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Contract-based expiry queries (6m, 12m, 18m, 24m)
  const expiry6mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '6m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const expiry12mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '12m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const expiry18mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '18m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const expiry24mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '24m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Slot-level current state query (NOT extrapolated)
  const slotCurrentStateQuery = useQuery({
    ...fctStorageSlotStateByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Slot-level expiry queries (NOT extrapolated)
  const slotExpiry6mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '6m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const slotExpiry12mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '12m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const slotExpiry18mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '18m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const slotExpiry24mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByAddressDailyServiceListOptions({
      query: {
        address_eq: address,
        expiry_policy_eq: '24m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Combine and normalize the data
  const processedData = useMemo((): ContractStorageDataPoint[] | null => {
    const currentData = currentStateQuery.data?.fct_contract_storage_state_by_address_daily;
    const expiry6mData = expiry6mQuery.data?.fct_contract_storage_state_with_expiry_by_address_daily;
    const expiry12mData = expiry12mQuery.data?.fct_contract_storage_state_with_expiry_by_address_daily;
    const expiry18mData = expiry18mQuery.data?.fct_contract_storage_state_with_expiry_by_address_daily;
    const expiry24mData = expiry24mQuery.data?.fct_contract_storage_state_with_expiry_by_address_daily;
    const slotCurrentData = slotCurrentStateQuery.data?.fct_storage_slot_state_by_address_daily;
    const slotExpiry6mData = slotExpiry6mQuery.data?.fct_storage_slot_state_with_expiry_by_address_daily;
    const slotExpiry12mData = slotExpiry12mQuery.data?.fct_storage_slot_state_with_expiry_by_address_daily;
    const slotExpiry18mData = slotExpiry18mQuery.data?.fct_storage_slot_state_with_expiry_by_address_daily;
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
        contractCurrentMap.set(item.day_start_date, {
          slots: item.active_slots ?? 0,
          bytes: item.effective_bytes ?? 0,
        });
      }
    });

    // Contract expiry maps
    const contractExpiryMaps: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '6m': new Map(),
      '12m': new Map(),
      '18m': new Map(),
      '24m': new Map(),
    };
    const contractExpiryData: Record<ExpiryPolicy, FctContractStorageStateWithExpiryByAddressDaily[] | undefined> = {
      '6m': expiry6mData,
      '12m': expiry12mData,
      '18m': expiry18mData,
      '24m': expiry24mData,
    };
    for (const policy of EXPIRY_POLICIES) {
      contractExpiryData[policy]?.forEach(item => {
        if (item.day_start_date) {
          contractExpiryMaps[policy].set(item.day_start_date, {
            slots: item.active_slots ?? 0,
            bytes: item.effective_bytes ?? 0,
          });
        }
      });
    }

    // Slot current state
    const slotCurrentMap = new Map<string, { slots: number; bytes: number }>();
    slotCurrentData?.forEach(item => {
      if (item.day_start_date) {
        slotCurrentMap.set(item.day_start_date, {
          slots: item.active_slots ?? 0,
          bytes: item.effective_bytes ?? 0,
        });
      }
    });

    // Slot expiry maps
    const slotExpiryMaps: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '6m': new Map(),
      '12m': new Map(),
      '18m': new Map(),
      '24m': new Map(),
    };
    const slotExpiryData: Record<ExpiryPolicy, FctStorageSlotStateWithExpiryByAddressDaily[] | undefined> = {
      '6m': slotExpiry6mData,
      '12m': slotExpiry12mData,
      '18m': slotExpiry18mData,
      '24m': slotExpiry24mData,
    };
    for (const policy of EXPIRY_POLICIES) {
      slotExpiryData[policy]?.forEach(item => {
        if (item.day_start_date) {
          slotExpiryMaps[policy].set(item.day_start_date, {
            slots: item.active_slots ?? 0,
            bytes: item.effective_bytes ?? 0,
          });
        }
      });
    }

    // === STEP 2: Determine date ranges ===
    const contractCurrentRange = getDateRange(contractCurrentMap);
    const slotCurrentRange = getDateRange(slotCurrentMap);

    if (!contractCurrentRange) return null;

    const contractLatestDate = new Date(contractCurrentRange.max);
    const slotLatestDate = slotCurrentRange ? new Date(slotCurrentRange.max) : null;

    // Find aligned latest date (max of both categories' latest)
    const alignedLatestDate =
      slotLatestDate && slotLatestDate > contractLatestDate ? slotLatestDate : contractLatestDate;

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
        current.setDate(current.getDate() + 1);
      }
      return filled;
    };

    // === STEP 4: Fill gaps for each dataset within its own range ===

    // Contract current - fill from min to max
    const filledContractCurrent = fillGaps(contractCurrentMap, contractCurrentRange.min, contractCurrentRange.max);

    // Contract expiry - fill each policy within its own range
    const filledContractExpiry: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '6m': new Map(),
      '12m': new Map(),
      '18m': new Map(),
      '24m': new Map(),
    };
    for (const policy of EXPIRY_POLICIES) {
      const range = getDateRange(contractExpiryMaps[policy]);
      if (range) {
        filledContractExpiry[policy] = fillGaps(contractExpiryMaps[policy], range.min, range.max);
      }
    }

    // Slot current - fill from min to max (if data exists)
    let filledSlotCurrent: Map<string, { slots: number; bytes: number }> | null = null;
    if (slotCurrentRange) {
      filledSlotCurrent = fillGaps(slotCurrentMap, slotCurrentRange.min, slotCurrentRange.max);
    }

    // Slot expiry - fill each policy within its own range
    const filledSlotExpiry: Record<ExpiryPolicy, Map<string, { slots: number; bytes: number }>> = {
      '6m': new Map(),
      '12m': new Map(),
      '18m': new Map(),
      '24m': new Map(),
    };
    for (const policy of EXPIRY_POLICIES) {
      const range = getDateRange(slotExpiryMaps[policy]);
      if (range) {
        filledSlotExpiry[policy] = fillGaps(slotExpiryMaps[policy], range.min, range.max);
      }
    }

    // === STEP 5: Build the date range for output ===
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine the end date based on extrapolation setting
    const endDate = extrapolate ? today : alignedLatestDate;
    const startDate = new Date(contractCurrentRange.min);

    // Generate all dates from start to end
    const allDates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      allDates.push(formatDateStr(current));
      current.setDate(current.getDate() + 1);
    }

    // === STEP 6: Get last known values for extrapolation ===
    const contractLastValue = filledContractCurrent.get(contractCurrentRange.max) ?? { slots: 0, bytes: 0 };
    const slotLastValue = filledSlotCurrent?.get(slotCurrentRange!.max) ?? null;

    const contractExpiryLastValues: Record<ExpiryPolicy, { slots: number; bytes: number } | null> = {
      '6m': null,
      '12m': null,
      '18m': null,
      '24m': null,
    };
    const slotExpiryLastValues: Record<ExpiryPolicy, { slots: number; bytes: number } | null> = {
      '6m': null,
      '12m': null,
      '18m': null,
      '24m': null,
    };

    for (const policy of EXPIRY_POLICIES) {
      const contractRange = getDateRange(contractExpiryMaps[policy]);
      if (contractRange) {
        contractExpiryLastValues[policy] = filledContractExpiry[policy].get(contractRange.max) ?? null;
      }
      const slotRange = getDateRange(slotExpiryMaps[policy]);
      if (slotRange) {
        slotExpiryLastValues[policy] = filledSlotExpiry[policy].get(slotRange.max) ?? null;
      }
    }

    // Calculate expiry dates (last datapoint + expiry period)
    const contractExpiryDates: Record<ExpiryPolicy, Date> = {
      '6m': addMonths(contractLatestDate, POLICY_MONTHS['6m']),
      '12m': addMonths(contractLatestDate, POLICY_MONTHS['12m']),
      '18m': addMonths(contractLatestDate, POLICY_MONTHS['18m']),
      '24m': addMonths(contractLatestDate, POLICY_MONTHS['24m']),
    };

    const slotExpiryDates: Record<ExpiryPolicy, Date> | null = slotLatestDate
      ? {
          '6m': addMonths(slotLatestDate, POLICY_MONTHS['6m']),
          '12m': addMonths(slotLatestDate, POLICY_MONTHS['12m']),
          '18m': addMonths(slotLatestDate, POLICY_MONTHS['18m']),
          '24m': addMonths(slotLatestDate, POLICY_MONTHS['24m']),
        }
      : null;

    // === STEP 7: Build final result ===
    const result: ContractStorageDataPoint[] = allDates.map(dateStr => {
      const date = new Date(dateStr);

      // --- Contract Current ---
      let contractCurrent: { slots: number; bytes: number } | null = null;
      if (filledContractCurrent.has(dateStr)) {
        // Within contract data range
        contractCurrent = filledContractCurrent.get(dateStr)!;
      } else if (extrapolate) {
        // Extrapolation ON: extend beyond range as straight line
        contractCurrent = contractLastValue;
      }
      // Extrapolation OFF: leave as null (dataset only shows within its own range)

      // --- Contract Expiry ---
      const contractExpiry: Record<ExpiryPolicy, ExpiryPolicyData> = {
        '6m': { activeSlots: null, effectiveBytes: null },
        '12m': { activeSlots: null, effectiveBytes: null },
        '18m': { activeSlots: null, effectiveBytes: null },
        '24m': { activeSlots: null, effectiveBytes: null },
      };

      for (const policy of EXPIRY_POLICIES) {
        const filled = filledContractExpiry[policy];
        const lastVal = contractExpiryLastValues[policy];
        const expiryDate = contractExpiryDates[policy];

        if (filled.has(dateStr)) {
          // Within expiry data range
          const val = filled.get(dateStr)!;
          contractExpiry[policy] = { activeSlots: val.slots, effectiveBytes: val.bytes };
        } else if (extrapolate && lastVal) {
          // Extrapolation ON: extend beyond range
          if (date >= expiryDate) {
            contractExpiry[policy] = { activeSlots: 0, effectiveBytes: 0 };
          } else {
            // Straight line from last datapoint
            contractExpiry[policy] = { activeSlots: lastVal.slots, effectiveBytes: lastVal.bytes };
          }
        }
        // Extrapolation OFF: leave as null (dataset only shows within its own range)
      }

      // --- Slot Current ---
      let slotCurrent: { slots: number; bytes: number } | null = null;
      if (filledSlotCurrent?.has(dateStr)) {
        // Within slot data range
        slotCurrent = filledSlotCurrent.get(dateStr)!;
      } else if (extrapolate && slotLastValue) {
        // Extrapolation ON: extend beyond range as straight line
        slotCurrent = slotLastValue;
      }
      // Extrapolation OFF: leave as null (dataset only shows within its own range)

      // --- Slot Expiry ---
      const slotExpiry: Record<ExpiryPolicy, ExpiryPolicyData> = {
        '6m': { activeSlots: null, effectiveBytes: null },
        '12m': { activeSlots: null, effectiveBytes: null },
        '18m': { activeSlots: null, effectiveBytes: null },
        '24m': { activeSlots: null, effectiveBytes: null },
      };

      for (const policy of EXPIRY_POLICIES) {
        const filled = filledSlotExpiry[policy];
        const lastVal = slotExpiryLastValues[policy];
        const expiryDate = slotExpiryDates?.[policy];

        if (filled.has(dateStr)) {
          // Within expiry data range
          const val = filled.get(dateStr)!;
          slotExpiry[policy] = { activeSlots: val.slots, effectiveBytes: val.bytes };
        } else if (extrapolate && lastVal && expiryDate) {
          // Extrapolation ON: extend beyond range
          if (date >= expiryDate) {
            slotExpiry[policy] = { activeSlots: 0, effectiveBytes: 0 };
          } else {
            // Straight line from last datapoint
            slotExpiry[policy] = { activeSlots: lastVal.slots, effectiveBytes: lastVal.bytes };
          }
        }
        // Extrapolation OFF: leave as null (dataset only shows within its own range)
      }

      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
    expiry6mQuery.data,
    expiry12mQuery.data,
    expiry18mQuery.data,
    expiry24mQuery.data,
    slotCurrentStateQuery.data,
    slotExpiry6mQuery.data,
    slotExpiry12mQuery.data,
    slotExpiry18mQuery.data,
    slotExpiry24mQuery.data,
    extrapolate,
  ]);

  const latestData = useMemo(() => {
    if (!processedData || processedData.length === 0) return null;
    return processedData[processedData.length - 1];
  }, [processedData]);

  const isLoading =
    currentStateQuery.isLoading ||
    expiry6mQuery.isLoading ||
    expiry12mQuery.isLoading ||
    expiry18mQuery.isLoading ||
    expiry24mQuery.isLoading ||
    slotCurrentStateQuery.isLoading ||
    slotExpiry6mQuery.isLoading ||
    slotExpiry12mQuery.isLoading ||
    slotExpiry18mQuery.isLoading ||
    slotExpiry24mQuery.isLoading;

  const error = (currentStateQuery.error ||
    expiry6mQuery.error ||
    expiry12mQuery.error ||
    expiry18mQuery.error ||
    expiry24mQuery.error ||
    slotCurrentStateQuery.error ||
    slotExpiry6mQuery.error ||
    slotExpiry12mQuery.error ||
    slotExpiry18mQuery.error ||
    slotExpiry24mQuery.error) as Error | null;

  return {
    data: processedData,
    latestData,
    isLoading,
    error,
  };
}
