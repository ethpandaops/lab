import { useMemo } from 'react';
import type { NormalizedDataPoint } from './useStateSizeData';

export type DeltaTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

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
  /** The last complete day, which the deltas end at */
  latest: NormalizedDataPoint;
  total: DeltaValue;
  accounts: BytesAndCountDelta;
  storage: BytesAndCountDelta;
  contractCodes: BytesAndCountDelta;
  currentDate: string;
  previousDate: string;
}

function calculateDelta(current: number, previous: number): DeltaValue {
  const delta = current - previous;
  const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { current, previous, delta, percentChange };
}

/** Days back to compare against, or null to compare against the first row */
function getTimeframeDays(timeframe: DeltaTimeframe): number | null {
  switch (timeframe) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'yearly':
      return 365;
    case 'all':
      return null;
  }
}

/**
 * Hook that calculates state deltas based on selected timeframe.
 * Today's row is still being written, so the comparison ends at the last complete UTC day and
 * starts at the day `timeframe` days before it (or the nearest earlier day with data), or at the first row for 'all'.
 */
export function useStateDelta(data: NormalizedDataPoint[] | null, timeframe: DeltaTimeframe): StateDelta | null {
  return useMemo(() => {
    if (!data || data.length < 2) return null;

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const complete = data.filter(point => point.date < todayUtc);
    const latestData = complete[complete.length - 1];
    if (!latestData) return null;

    const days = getTimeframeDays(timeframe);
    let previousData: NormalizedDataPoint | undefined;
    if (days === null) {
      previousData = complete[0];
    } else {
      const targetDate = new Date(latestData.date);
      targetDate.setUTCDate(targetDate.getUTCDate() - days);
      for (const point of complete) {
        if (point.date > targetDate) break;
        previousData = point;
      }
    }
    if (!previousData) return null;

    return {
      latest: latestData,
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
