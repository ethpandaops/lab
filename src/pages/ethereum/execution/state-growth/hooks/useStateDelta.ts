import { useMemo } from 'react';

export type DeltaTimeframe = 'daily' | 'weekly' | 'monthly';

interface DeltaValue {
  current: number;
  previous: number;
  delta: number;
  percentChange: number;
}

interface BytesAndCountDelta {
  bytes: DeltaValue;
  count: DeltaValue;
}

export interface StateDelta {
  total: DeltaValue;
  accounts: BytesAndCountDelta;
  storage: BytesAndCountDelta;
  contractCodes: BytesAndCountDelta;
  currentDate: string;
  previousDate: string;
}

interface NormalizedDataPoint {
  date: Date;
  dateLabel: string;
  total_bytes: number;
  account_trienode_bytes: number;
  storage_trienode_bytes: number;
  contract_code_bytes: number;
  accounts: number;
  storages: number;
  contract_codes: number;
}

function calculateDelta(current: number, previous: number): DeltaValue {
  const delta = current - previous;
  const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { current, previous, delta, percentChange };
}

function getTimeframeDays(timeframe: DeltaTimeframe): number {
  switch (timeframe) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
  }
}

/**
 * Hook that calculates state deltas based on selected timeframe.
 * Uses the latest data point and compares with a previous data point based on timeframe.
 */
export function useStateDelta(data: NormalizedDataPoint[] | null, timeframe: DeltaTimeframe): StateDelta | null {
  return useMemo(() => {
    if (!data || data.length < 2) return null;

    // Get the latest data point
    const latestData = data[data.length - 1];
    const daysBack = getTimeframeDays(timeframe);

    // Find the data point closest to the target date (daysBack days ago)
    const targetDate = new Date(latestData.date);
    targetDate.setDate(targetDate.getDate() - daysBack);

    // Find the closest data point to the target date
    let previousData: NormalizedDataPoint | null = null;
    let closestDiff = Infinity;

    for (const point of data) {
      if (point.date >= latestData.date) continue;
      const diff = Math.abs(point.date.getTime() - targetDate.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        previousData = point;
      }
    }

    // If no previous data found, use the second to last data point
    if (!previousData) {
      previousData = data[data.length - 2];
    }

    return {
      total: calculateDelta(latestData.total_bytes, previousData.total_bytes),
      accounts: {
        bytes: calculateDelta(latestData.account_trienode_bytes, previousData.account_trienode_bytes),
        count: calculateDelta(latestData.accounts, previousData.accounts),
      },
      storage: {
        bytes: calculateDelta(latestData.storage_trienode_bytes, previousData.storage_trienode_bytes),
        count: calculateDelta(latestData.storages, previousData.storages),
      },
      contractCodes: {
        bytes: calculateDelta(latestData.contract_code_bytes, previousData.contract_code_bytes),
        count: calculateDelta(latestData.contract_codes, previousData.contract_codes),
      },
      currentDate: latestData.dateLabel,
      previousDate: previousData.dateLabel,
    };
  }, [data, timeframe]);
}
