import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fctValidatorCountByEntityByStatusDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctValidatorCountByEntityByStatusDaily } from '@/api/types.gen';

export interface EntityValidatorStatusData {
  days: string[];
  statuses: string[];
  byStatus: Map<string, Map<string, number>>;
  latestTotalCount: number;
  latestActiveCount: number;
}

/**
 * Hook to fetch validator count by status data for an entity.
 * Fetches all available data and filters client-side by days parameter.
 */
export function useEntityValidatorStatusData(entityName: string, days: number | null) {
  const query = useQuery({
    ...fctValidatorCountByEntityByStatusDailyServiceListOptions({
      query: {
        entity_eq: entityName,
        day_start_date_starts_with: '20',
        order_by: 'day_start_date asc',
        page_size: 10000,
      },
    }),
    enabled: entityName.length > 0,
  });

  const data = useMemo((): EntityValidatorStatusData | null => {
    const rows = query.data?.fct_validator_count_by_entity_by_status_daily;
    if (!rows || rows.length === 0) return null;

    let filtered: FctValidatorCountByEntityByStatusDaily[] = rows;

    if (days !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      filtered = rows.filter((r: FctValidatorCountByEntityByStatusDaily) => (r.day_start_date ?? '') >= cutoffStr);
    }

    if (filtered.length === 0) return null;

    const daysSet = new Set<string>();
    const statusesSet = new Set<string>();
    const byStatus = new Map<string, Map<string, number>>();

    for (const row of filtered) {
      const day = row.day_start_date ?? '';
      const status = row.status ?? 'unknown';
      const count = row.validator_count ?? 0;

      daysSet.add(day);
      statusesSet.add(status);

      if (!byStatus.has(status)) {
        byStatus.set(status, new Map());
      }
      byStatus.get(status)!.set(day, count);
    }

    const sortedDays = [...daysSet].sort();
    const statuses = [...statusesSet].sort();

    const latestDay = sortedDays[sortedDays.length - 1];
    let latestTotalCount = 0;
    let latestActiveCount = 0;
    for (const [status, dayMap] of byStatus) {
      const count = dayMap.get(latestDay) ?? 0;
      latestTotalCount += count;
      if (status === 'active_ongoing' || status === 'active_exiting') {
        latestActiveCount += count;
      }
    }

    return { days: sortedDays, statuses, byStatus, latestTotalCount, latestActiveCount };
  }, [query.data, days]);

  return {
    data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
