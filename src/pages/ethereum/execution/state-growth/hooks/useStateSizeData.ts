import { useMemo } from 'react';
import { currentUtcDate } from '@/utils/time';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctExecutionStateSizeDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctExecutionStateSizeDaily } from '@/api/types.gen';

export interface NormalizedDataPoint {
  date: Date;
  dateLabel: string;
  total_bytes: number;
  account_bytes: number;
  account_trienode_bytes: number;
  storage_bytes: number;
  storage_trienode_bytes: number;
  contract_code_bytes: number;
  accounts: number;
  storages: number;
  contract_codes: number;
}

interface UseStateSizeDataResult {
  data: NormalizedDataPoint[] | null;
  latestData: NormalizedDataPoint | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Normalize daily data to common format
 */
function normalizeDailyData(data: FctExecutionStateSizeDaily[]): NormalizedDataPoint[] {
  return data
    .filter(
      (item): item is FctExecutionStateSizeDaily & { day_start_date: string } => item.day_start_date !== undefined
    )
    .map(item => {
      const date = new Date(`${item.day_start_date}T00:00:00Z`);
      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        total_bytes: item.total_bytes ?? 0,
        account_bytes: item.account_bytes ?? 0,
        account_trienode_bytes: item.account_trienode_bytes ?? 0,
        storage_bytes: item.storage_bytes ?? 0,
        storage_trienode_bytes: item.storage_trienode_bytes ?? 0,
        contract_code_bytes: item.contract_code_bytes ?? 0,
        accounts: item.accounts ?? 0,
        storages: item.storages ?? 0,
        contract_codes: item.contract_codes ?? 0,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Hook that fetches daily state size data.
 */
export function useStateSizeData(): UseStateSizeDataResult {
  const today = currentUtcDate();
  const dailyQuery = useQuery({
    ...fctExecutionStateSizeDailyServiceListOptions({
      query: { day_start_date_ne: today, page_size: 10000 },
    }),
    placeholderData: keepPreviousData,
  });

  const normalizedData = useMemo((): NormalizedDataPoint[] | null => {
    if (!dailyQuery.data) return null;
    return normalizeDailyData(dailyQuery.data.fct_execution_state_size_daily ?? []);
  }, [dailyQuery.data]);

  const latestData = useMemo(() => normalizedData?.at(-1) ?? null, [normalizedData]);

  return {
    data: normalizedData,
    latestData,
    isLoading: dailyQuery.isLoading,
    error: dailyQuery.error as Error | null,
  };
}
