import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fctExecutionStateSizeDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctExecutionStateSizeDaily } from '@/api/types.gen';

interface NormalizedDataPoint {
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
      const date = new Date(item.day_start_date);
      return {
        date,
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
  const dailyQuery = useQuery({
    ...fctExecutionStateSizeDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        page_size: 10000,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const normalizedData = useMemo((): NormalizedDataPoint[] | null => {
    if (!dailyQuery.data?.fct_execution_state_size_daily) return null;
    return normalizeDailyData(dailyQuery.data.fct_execution_state_size_daily);
  }, [dailyQuery.data]);

  const latestData = useMemo(() => {
    if (!normalizedData || normalizedData.length === 0) return null;
    return normalizedData[normalizedData.length - 1];
  }, [normalizedData]);

  return {
    data: normalizedData,
    latestData,
    isLoading: dailyQuery.isLoading,
    error: dailyQuery.error as Error | null,
  };
}
