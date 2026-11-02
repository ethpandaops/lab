import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fctValidatorCountByEntityByStatusDailyServiceList } from '@/api/sdk.gen';
import type { FctValidatorCountByEntityByStatusDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

export interface EntityValidatorStatusData {
  days: string[];
  statuses: string[];
  byStatus: Map<string, Map<string, number>>;
  /** Validators on the latest day with data, whatever the window */
  latestTotalCount: number;
  /** Active validators on the latest day with data, whatever the window */
  latestActiveCount: number;
}

/**
 * Validator counts by status for an entity, one series per status over the last `days` days (all history when
 * null). The latest counts always come from the newest day, so they don't change with the window.
 */
export function useEntityValidatorStatusData(
  entityName: string,
  days: number | null
): { data: EntityValidatorStatusData | null; isLoading: boolean; error: Error | null } {
  const { currentNetwork } = useNetwork();
  const query = useQuery({
    queryKey: ['entities', 'validator-status', currentNetwork?.name, entityName],
    queryFn: ({ signal }) =>
      fetchAllPages<FctValidatorCountByEntityByStatusDaily>(
        fctValidatorCountByEntityByStatusDailyServiceList,
        {
          query: {
            entity_eq: entityName,
            day_start_date_starts_with: '20',
            order_by: 'day_start_date asc',
            page_size: 10000,
          },
        },
        'fct_validator_count_by_entity_by_status_daily',
        signal
      ),
    enabled: entityName.length > 0,
  });

  const data = useMemo((): EntityValidatorStatusData | null => {
    const rows = query.data;
    if (!rows || rows.length === 0) return null;

    const latestDay = rows.reduce((max, r) => ((r.day_start_date ?? '') > max ? (r.day_start_date ?? '') : max), '');
    let latestTotalCount = 0;
    let latestActiveCount = 0;
    for (const row of rows) {
      if (row.day_start_date !== latestDay) continue;
      latestTotalCount += row.validator_count ?? 0;
      if (row.status === 'active_ongoing' || row.status === 'active_exiting') {
        latestActiveCount += row.validator_count ?? 0;
      }
    }

    let filtered = rows;
    if (days !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      filtered = rows.filter(r => (r.day_start_date ?? '') >= cutoffStr);
    }

    const daysSet = new Set<string>();
    const statusesSet = new Set<string>();
    const byStatus = new Map<string, Map<string, number>>();

    for (const row of filtered) {
      const day = row.day_start_date ?? '';
      const status = row.status ?? 'unknown';
      daysSet.add(day);
      statusesSet.add(status);
      if (!byStatus.has(status)) byStatus.set(status, new Map());
      byStatus.get(status)!.set(day, row.validator_count ?? 0);
    }

    return {
      days: [...daysSet].sort(),
      statuses: [...statusesSet].sort(),
      byStatus,
      latestTotalCount,
      latestActiveCount,
    };
  }, [query.data, days]);

  return {
    data,
    isLoading: query.isLoading,
    error: (query.error ?? null) as Error | null,
  };
}
