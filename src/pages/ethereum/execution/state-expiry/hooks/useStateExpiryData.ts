import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fctStorageSlotStateByBlockDailyServiceListOptions,
  fctStorageSlotStateWithExpiryByBlockDailyServiceListOptions,
  fctContractStorageStateWithExpiryByBlockDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctStorageSlotStateByBlockDaily,
  FctStorageSlotStateWithExpiryByBlockDaily,
  FctContractStorageStateWithExpiryByBlockDaily,
} from '@/api/types.gen';

/** Available expiry policy options */
export const EXPIRY_POLICIES = ['12m', '24m'] as const;
export type ExpiryPolicy = (typeof EXPIRY_POLICIES)[number];

/** Available expiry type options */
export const EXPIRY_TYPES = ['slot', 'contract'] as const;
export type ExpiryType = (typeof EXPIRY_TYPES)[number];

/** Data for a specific slot-based expiry policy (null when data is unavailable) */
interface SlotExpiryPolicyData {
  activeSlots: number | null;
  effectiveBytes: number | null;
}

/** Data for a specific contract-based expiry policy (null when data is unavailable) */
interface ContractExpiryPolicyData {
  activeSlots: number | null;
  effectiveBytes: number | null;
  activeContracts: number | null;
}

interface StateExpiryDataPoint {
  date: Date;
  dateLabel: string;
  /** Active slots without expiry policy */
  activeSlots: number;
  /** Effective bytes without expiry policy (leading zeros stripped) */
  effectiveBytes: number;
  /** Slot-based expiry data for each policy */
  slotExpiryData: Record<ExpiryPolicy, SlotExpiryPolicyData>;
  /** Contract-based expiry data for each policy */
  contractExpiryData: Record<ExpiryPolicy, ContractExpiryPolicyData>;
}

interface UseStateExpiryDataResult {
  data: StateExpiryDataPoint[] | null;
  latestData: StateExpiryDataPoint | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that fetches daily state expiry data from multiple endpoints:
 * - fct_storage_slot_state_by_block_daily (current state baseline)
 * - fct_storage_slot_state_with_expiry_by_block_daily (slot-based expiry per policy)
 * - fct_contract_storage_state_with_expiry_by_block_daily (contract-based expiry per policy)
 *
 * Returns daily data with overlaid comparison between current state and states with various expiry policies.
 */
export function useStateExpiryData(): UseStateExpiryDataResult {
  // Fetch current state daily data (baseline)
  const currentStateQuery = useQuery({
    ...fctStorageSlotStateByBlockDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Slot-based expiry queries
  const slotExpiry12mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByBlockDailyServiceListOptions({
      query: {
        expiry_policy_eq: '12m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const slotExpiry24mQuery = useQuery({
    ...fctStorageSlotStateWithExpiryByBlockDailyServiceListOptions({
      query: {
        expiry_policy_eq: '24m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Contract-based expiry queries
  const contractExpiry12mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByBlockDailyServiceListOptions({
      query: {
        expiry_policy_eq: '12m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const contractExpiry24mQuery = useQuery({
    ...fctContractStorageStateWithExpiryByBlockDailyServiceListOptions({
      query: {
        expiry_policy_eq: '24m',
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  // Combine and normalize the data
  const processedData = useMemo((): StateExpiryDataPoint[] | null => {
    const currentData = currentStateQuery.data?.fct_storage_slot_state_by_block_daily;

    // Slot expiry data
    const slotExpiry12mData = slotExpiry12mQuery.data?.fct_storage_slot_state_with_expiry_by_block_daily;
    const slotExpiry24mData = slotExpiry24mQuery.data?.fct_storage_slot_state_with_expiry_by_block_daily;

    // Contract expiry data
    const contractExpiry12mData = contractExpiry12mQuery.data?.fct_contract_storage_state_with_expiry_by_block_daily;
    const contractExpiry24mData = contractExpiry24mQuery.data?.fct_contract_storage_state_with_expiry_by_block_daily;

    // Need at least current data and all slot expiry data
    if (!currentData || !slotExpiry12mData || !slotExpiry24mData) {
      return null;
    }

    // Create map for current state lookup by date
    const currentMap = new Map<string, FctStorageSlotStateByBlockDaily>();
    currentData.forEach(item => {
      if (item.day_start_date) {
        currentMap.set(item.day_start_date, item);
      }
    });

    // Helper to create a map from date to slot expiry data
    const createSlotDateMap = (
      data: FctStorageSlotStateWithExpiryByBlockDaily[]
    ): Map<string, FctStorageSlotStateWithExpiryByBlockDaily> => {
      const map = new Map<string, FctStorageSlotStateWithExpiryByBlockDaily>();
      data.forEach(item => {
        if (item.day_start_date) {
          map.set(item.day_start_date, item);
        }
      });
      return map;
    };

    // Helper to create a map from date to contract expiry data
    const createContractDateMap = (
      data: FctContractStorageStateWithExpiryByBlockDaily[] | undefined
    ): Map<string, FctContractStorageStateWithExpiryByBlockDaily> => {
      const map = new Map<string, FctContractStorageStateWithExpiryByBlockDaily>();
      if (data) {
        data.forEach(item => {
          if (item.day_start_date) {
            map.set(item.day_start_date, item);
          }
        });
      }
      return map;
    };

    // Create maps for slot expiry policies
    const slotExpiryMaps: Record<ExpiryPolicy, Map<string, FctStorageSlotStateWithExpiryByBlockDaily>> = {
      '12m': createSlotDateMap(slotExpiry12mData),
      '24m': createSlotDateMap(slotExpiry24mData),
    };

    // Create maps for contract expiry policies
    const contractExpiryMaps: Record<ExpiryPolicy, Map<string, FctContractStorageStateWithExpiryByBlockDaily>> = {
      '12m': createContractDateMap(contractExpiry12mData),
      '24m': createContractDateMap(contractExpiry24mData),
    };

    // Get dates that exist in current state
    const validDates = Array.from(currentMap.keys()).sort();

    if (validDates.length === 0) {
      return null;
    }

    return validDates.map(dateStr => {
      const current = currentMap.get(dateStr)!;
      const date = new Date(dateStr);

      // Build slot expiry data for all policies
      const slotExpiryByPolicy = {} as Record<ExpiryPolicy, SlotExpiryPolicyData>;
      for (const policy of EXPIRY_POLICIES) {
        const policyData = slotExpiryMaps[policy].get(dateStr);
        slotExpiryByPolicy[policy] = policyData
          ? {
              activeSlots: policyData.active_slots ?? null,
              effectiveBytes: policyData.effective_bytes ?? null,
            }
          : {
              activeSlots: null,
              effectiveBytes: null,
            };
      }

      // Build contract expiry data for all policies
      const contractExpiryByPolicy = {} as Record<ExpiryPolicy, ContractExpiryPolicyData>;
      for (const policy of EXPIRY_POLICIES) {
        const policyData = contractExpiryMaps[policy].get(dateStr);
        contractExpiryByPolicy[policy] = policyData
          ? {
              activeSlots: policyData.active_slots ?? null,
              effectiveBytes: policyData.effective_bytes ?? null,
              activeContracts: policyData.active_contracts ?? null,
            }
          : {
              activeSlots: null,
              effectiveBytes: null,
              activeContracts: null,
            };
      }

      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        activeSlots: current.active_slots ?? 0,
        effectiveBytes: current.effective_bytes ?? 0,
        slotExpiryData: slotExpiryByPolicy,
        contractExpiryData: contractExpiryByPolicy,
      };
    });
  }, [
    currentStateQuery.data,
    slotExpiry12mQuery.data,
    slotExpiry24mQuery.data,
    contractExpiry12mQuery.data,
    contractExpiry24mQuery.data,
  ]);

  const latestData = useMemo(() => {
    if (!processedData || processedData.length === 0) return null;
    return processedData[processedData.length - 1];
  }, [processedData]);

  const isLoading =
    currentStateQuery.isLoading ||
    slotExpiry12mQuery.isLoading ||
    slotExpiry24mQuery.isLoading ||
    contractExpiry12mQuery.isLoading ||
    contractExpiry24mQuery.isLoading;

  const error = (currentStateQuery.error ||
    slotExpiry12mQuery.error ||
    slotExpiry24mQuery.error ||
    contractExpiry12mQuery.error ||
    contractExpiry24mQuery.error) as Error | null;

  return {
    data: processedData,
    latestData,
    isLoading,
    error,
  };
}
