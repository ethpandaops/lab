import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctStorageSlotStateDailyServiceListOptions,
  fctStorageSlotStateWithExpiryDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctStorageSlotStateDaily, FctStorageSlotStateWithExpiryDaily } from '@/api/types.gen';

/** Available expiry policy options */
export const EXPIRY_POLICIES = ['6m', '12m', '18m', '24m'] as const;
export type ExpiryPolicy = (typeof EXPIRY_POLICIES)[number];

/** Data for a specific expiry policy (null when data is unavailable) */
interface ExpiryPolicyData {
  activeSlots: number | null;
  effectiveBytes: number | null;
}

interface StorageSlotDataPoint {
  date: Date;
  dateLabel: string;
  /** Active slots without expiry policy */
  activeSlots: number;
  /** Effective bytes without expiry policy (leading zeros stripped) */
  effectiveBytes: number;
  /** Data for each expiry policy */
  expiryData: Record<ExpiryPolicy, ExpiryPolicyData>;
}

interface UseStorageSlotStateDataResult {
  data: StorageSlotDataPoint[] | null;
  latestData: StorageSlotDataPoint | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that fetches daily storage slot state data from both endpoints:
 * - fct_storage_slot_state_daily (current state)
 * - fct_storage_slot_state_with_expiry_daily (separate request per policy: 1m, 6m, 12m, 18m, 24m)
 *
 * Returns daily data with overlaid comparison between current state and states with various expiry policies.
 */
export function useStorageSlotStateData(): UseStorageSlotStateDataResult {
  // Fetch current state daily data
  const currentStateQuery = useQuery({
    ...fctStorageSlotStateDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Fetch state with 6m expiry policy
  const expiry6mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryDailyServiceListOptions({
      query: {
        expiry_policy_eq: '6m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Fetch state with 12m expiry policy
  const expiry12mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryDailyServiceListOptions({
      query: {
        expiry_policy_eq: '12m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Fetch state with 18m expiry policy
  const expiry18mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryDailyServiceListOptions({
      query: {
        expiry_policy_eq: '18m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Fetch state with 24m expiry policy
  const expiry24mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryDailyServiceListOptions({
      query: {
        expiry_policy_eq: '24m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Combine and normalize the data
  const processedData = useMemo((): StorageSlotDataPoint[] | null => {
    const currentData = currentStateQuery.data?.fct_storage_slot_state_daily;
    const expiry6mData = expiry6mQuery.data?.fct_storage_slot_state_with_expiry_daily;
    const expiry12mData = expiry12mQuery.data?.fct_storage_slot_state_with_expiry_daily;
    const expiry18mData = expiry18mQuery.data?.fct_storage_slot_state_with_expiry_daily;
    const expiry24mData = expiry24mQuery.data?.fct_storage_slot_state_with_expiry_daily;

    if (!currentData || !expiry6mData || !expiry12mData || !expiry18mData || !expiry24mData) {
      return null;
    }

    // Create map for current state lookup by date
    const currentMap = new Map<string, FctStorageSlotStateDaily>();
    currentData.forEach(item => {
      if (item.day_start_date) {
        currentMap.set(item.day_start_date, item);
      }
    });

    // Helper to create a map from date to data
    const createDateMap = (
      data: FctStorageSlotStateWithExpiryDaily[]
    ): Map<string, FctStorageSlotStateWithExpiryDaily> => {
      const map = new Map<string, FctStorageSlotStateWithExpiryDaily>();
      data.forEach(item => {
        if (item.day_start_date) {
          map.set(item.day_start_date, item);
        }
      });
      return map;
    };

    // Create maps for each expiry policy
    const expiryMaps: Record<ExpiryPolicy, Map<string, FctStorageSlotStateWithExpiryDaily>> = {
      '6m': createDateMap(expiry6mData),
      '12m': createDateMap(expiry12mData),
      '18m': createDateMap(expiry18mData),
      '24m': createDateMap(expiry24mData),
    };

    // Get dates that exist in current state
    const validDates = Array.from(currentMap.keys()).sort(); // Sort ascending for chart display

    if (validDates.length === 0) {
      return null;
    }

    return validDates.map(dateStr => {
      const current = currentMap.get(dateStr)!;
      const date = new Date(dateStr);

      // Build expiry data for all policies, using null when data is missing (creates gaps in chart)
      const expiryDataByPolicy = {} as Record<ExpiryPolicy, ExpiryPolicyData>;
      for (const policy of EXPIRY_POLICIES) {
        const policyData = expiryMaps[policy].get(dateStr);
        expiryDataByPolicy[policy] = policyData
          ? {
              activeSlots: policyData.active_slots ?? null,
              effectiveBytes: policyData.effective_bytes ?? null,
            }
          : {
              activeSlots: null,
              effectiveBytes: null,
            };
      }

      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        activeSlots: current.active_slots ?? 0,
        effectiveBytes: current.effective_bytes ?? 0,
        expiryData: expiryDataByPolicy,
      };
    });
  }, [currentStateQuery.data, expiry6mQuery.data, expiry12mQuery.data, expiry18mQuery.data, expiry24mQuery.data]);

  const latestData = useMemo(() => {
    if (!processedData || processedData.length === 0) return null;
    return processedData[processedData.length - 1];
  }, [processedData]);

  const isLoading =
    currentStateQuery.isLoading ||
    expiry6mQuery.isLoading ||
    expiry12mQuery.isLoading ||
    expiry18mQuery.isLoading ||
    expiry24mQuery.isLoading;

  const error = (currentStateQuery.error ||
    expiry6mQuery.error ||
    expiry12mQuery.error ||
    expiry18mQuery.error ||
    expiry24mQuery.error) as Error | null;

  return {
    data: processedData,
    latestData,
    isLoading,
    error,
  };
}
