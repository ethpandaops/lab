import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctStorageSlotStateDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctStorageSlotStateDaily } from '@/api/types.gen';

export interface StorageSlotDataPoint {
  date: Date;
  dateLabel: string;
  /** Cumulative active slots (no expiry) */
  activeSlots: number;
  /** Cumulative active slots with 6-month expiry applied */
  activeSlotsWithExpiry: number;
  /** Cumulative effective bytes (no expiry) */
  effectiveBytes: number;
  /** Cumulative effective bytes with 6-month expiry applied */
  effectiveBytesWithExpiry: number;
  /** Calculated expired slots (active - activeWithExpiry) */
  expiredSlots: number;
  /** Calculated expired bytes (effective - effectiveWithExpiry) */
  expiredBytes: number;
}

export interface UseStorageSlotStateDailyResult {
  data: StorageSlotDataPoint[] | null;
  latestData: StorageSlotDataPoint | null;
  isLoading: boolean;
  error: Error | null;
  /** Whether mock data is being used */
  isMockData: boolean;
}

// Generate mock data for demonstration purposes
// TODO: Remove when real API data is available
function generateMockData(): StorageSlotDataPoint[] {
  const data: StorageSlotDataPoint[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-12');

  // Base values (in bytes and slot counts)
  let effectiveBytes = 180_000_000_000_000; // ~180 TB starting point
  let activeSlots = 800_000_000; // 800M slots starting point

  // Expiry starts at ~15% and grows to ~25% over time
  let expiryRatio = 0.15;

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Daily growth (realistic Ethereum state growth)
    const dailyBytesGrowth = 150_000_000_000 + Math.random() * 50_000_000_000; // ~150-200 GB/day
    const dailySlotsGrowth = 500_000 + Math.random() * 200_000; // ~500-700K slots/day

    effectiveBytes += dailyBytesGrowth;
    activeSlots += dailySlotsGrowth;

    // Expiry ratio slowly increases over time (old state expires)
    expiryRatio = Math.min(0.28, expiryRatio + 0.0003 + Math.random() * 0.0002);

    const expiredBytes = Math.floor(effectiveBytes * expiryRatio);
    const expiredSlots = Math.floor(activeSlots * expiryRatio);

    data.push({
      date: new Date(currentDate),
      dateLabel: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      activeSlots: Math.floor(activeSlots),
      activeSlotsWithExpiry: Math.floor(activeSlots - expiredSlots),
      effectiveBytes: Math.floor(effectiveBytes),
      effectiveBytesWithExpiry: Math.floor(effectiveBytes - expiredBytes),
      expiredSlots: Math.floor(expiredSlots),
      expiredBytes: Math.floor(expiredBytes),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

function normalizeDailyData(data: FctStorageSlotStateDaily[]): StorageSlotDataPoint[] {
  return data
    .filter((item): item is FctStorageSlotStateDaily & { day_start_date: string } => item.day_start_date !== undefined)
    .map(item => {
      const date = new Date(item.day_start_date);
      const activeSlots = item.active_slots ?? 0;
      const activeSlotsWithExpiry = item.active_slots_with_six_months_expiry ?? 0;
      const effectiveBytes = item.effective_bytes ?? 0;
      const effectiveBytesWithExpiry = item.effective_bytes_with_six_months_expiry ?? 0;

      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        activeSlots,
        activeSlotsWithExpiry,
        effectiveBytes,
        effectiveBytesWithExpiry,
        expiredSlots: activeSlots - activeSlotsWithExpiry,
        expiredBytes: effectiveBytes - effectiveBytesWithExpiry,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Cache mock data to prevent regeneration on every render
let cachedMockData: StorageSlotDataPoint[] | null = null;

export function useStorageSlotStateDaily(): UseStorageSlotStateDailyResult {
  const query = useQuery({
    ...fctStorageSlotStateDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        page_size: 10000,
        order_by: 'day_start_date',
      },
    }),
    placeholderData: keepPreviousData,
  });

  const { normalizedData, isMockData } = useMemo((): {
    normalizedData: StorageSlotDataPoint[] | null;
    isMockData: boolean;
  } => {
    // Check if we have real API data
    const apiData = query.data?.fct_storage_slot_state_daily;
    if (apiData && apiData.length > 0) {
      return { normalizedData: normalizeDailyData(apiData), isMockData: false };
    }

    // Use mock data if API returns empty or no data (and query is not loading)
    if (!query.isLoading) {
      if (!cachedMockData) {
        cachedMockData = generateMockData();
      }
      return { normalizedData: cachedMockData, isMockData: true };
    }

    return { normalizedData: null, isMockData: false };
  }, [query.data, query.isLoading]);

  const latestData = useMemo(() => {
    if (!normalizedData || normalizedData.length === 0) return null;
    return normalizedData[normalizedData.length - 1];
  }, [normalizedData]);

  return {
    data: normalizedData,
    latestData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    isMockData,
  };
}
