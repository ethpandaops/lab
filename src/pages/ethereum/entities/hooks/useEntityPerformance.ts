import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

import {
  ENTITY_TABLES,
  fctValidatorPerformanceByEntityRollingList,
  type FctValidatorPerformanceByEntityRolling,
} from '@/pages/ethereum/entities/api/entity-models';
import type { EntitiesWindow } from '@/pages/ethereum/entities/constants';
import { addCounts, EMPTY_COUNTS, toCounts, type PerformanceCounts } from '@/pages/ethereum/entities/utils/performance';

export interface UseEntityPerformanceResult {
  /** Counts per entity over the period; entities with no duties or proposals in it are absent */
  entities: Map<string, PerformanceCounts>;
  /** Counts of every validator over the period */
  network: PerformanceCounts;
  /** Period start (Unix seconds): the window's, or the data's when it starts later */
  start?: number;
  /** Period end (Unix seconds), exclusive */
  end?: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Attestation and proposal counts of every entity over one rolling period of the finalized chain, plus their sum
 * for the whole network.
 */
export function useEntityPerformance(period: EntitiesWindow): UseEntityPerformanceResult {
  const { currentNetwork } = useNetwork();
  const query = useQuery({
    queryKey: ['entities', 'performance', currentNetwork?.name, period],
    queryFn: ({ signal }) =>
      fetchAllPages<FctValidatorPerformanceByEntityRolling>(
        fctValidatorPerformanceByEntityRollingList,
        { query: { period_eq: period, page_size: 10_000 } },
        ENTITY_TABLES.rolling,
        signal
      ),
    enabled: !!currentNetwork,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  // Memoised so consumers get stable references between renders
  const result = useMemo(() => {
    const entities = new Map<string, PerformanceCounts>();
    let network = EMPTY_COUNTS;
    for (const row of query.data ?? []) {
      const counts = toCounts(row);
      entities.set(row.entity || 'unknown', counts);
      network = addCounts(network, counts);
    }
    const first = query.data?.[0];
    return { entities, network, start: first?.period_start_date_time, end: first?.period_end_date_time };
  }, [query.data]);

  return { ...result, isLoading: query.isLoading, error: (query.error ?? null) as Error | null };
}
