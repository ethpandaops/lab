import { useQuery } from '@tanstack/react-query';
import { fctValidatorCountByEntityByStatusDailyServiceList } from '@/api/sdk.gen';
import type { FctValidatorCountByEntityByStatusDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { ENTITY_OPTIONS_STATUS, PAGE_SIZE } from '../constants';
import { dailyDateValues, toEntityOptions, type EntityOption } from '../utils/client-share';

export interface UseEntityOptionsResult {
  /** Entities with active validators, largest first */
  options: EntityOption[];
  isLoading: boolean;
}

/**
 * Entities to filter the page by: every entity with active validators in the latest daily counts.
 */
export function useEntityOptions(): UseEntityOptionsResult {
  const { currentNetwork } = useNetwork();

  const query = useQuery({
    queryKey: ['graffiti-clients', 'entities', currentNetwork?.name],
    queryFn: async ({ signal }): Promise<EntityOption[]> => {
      const rows = await fetchAllPages<FctValidatorCountByEntityByStatusDaily>(
        fctValidatorCountByEntityByStatusDailyServiceList,
        {
          query: {
            day_start_date_in_values: dailyDateValues(3),
            status_eq: ENTITY_OPTIONS_STATUS,
            page_size: PAGE_SIZE,
          },
        },
        'fct_validator_count_by_entity_by_status_daily',
        signal
      );
      return toEntityOptions(rows);
    },
    enabled: !!currentNetwork,
    staleTime: 10 * 60 * 1000,
  });

  return { options: query.data ?? [], isLoading: query.isLoading };
}
