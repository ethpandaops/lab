import { useQuery } from '@tanstack/react-query';

import { fctValidatorCountByCredentialTypeDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { fctValidatorStakeByEntityDailyServiceList } from '@/api/sdk.gen';
import type { FctValidatorStakeByEntityDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

import { daysBack } from '../utils/overview';

const GWEI = 1e9;
const PAGE_SIZE = 10_000;
/** Spans up to this many days plot every day; longer ones plot every seventh */
const DAILY_SPAN_DAYS = 90;

export interface UseStakeShareHistoryResult {
  /** Plotted days, oldest first */
  days: string[];
  /** Stake per plotted day for each requested entity, in ETH */
  byEntity: Map<string, (number | null)[]>;
  /** Network stake per plotted day, in ETH; null where the table has no row */
  totals: (number | null)[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Stake over the window for a few entities, next to the network total so the rest can be shown as one band.
 */
export function useStakeShareHistory(
  entities: string[],
  firstDay: string | undefined,
  latestDay: string | undefined
): UseStakeShareHistoryResult {
  const { currentNetwork } = useNetwork();

  const spanDays =
    firstDay && latestDay ? (Date.parse(`${latestDay}T00:00:00Z`) - Date.parse(`${firstDay}T00:00:00Z`)) / 864e5 : 0;
  const days = firstDay && latestDay ? daysBack(firstDay, latestDay, spanDays <= DAILY_SPAN_DAYS ? 1 : 7) : [];
  const dayValues = days.join(',');

  const stake = useQuery({
    queryKey: ['entities', 'stake-history', currentNetwork?.name, entities.join(','), dayValues],
    queryFn: ({ signal }) =>
      fetchAllPages<FctValidatorStakeByEntityDaily>(
        fctValidatorStakeByEntityDailyServiceList,
        {
          query: { day_start_date_in_values: dayValues, entity_in_values: entities.join(','), page_size: PAGE_SIZE },
        },
        'fct_validator_stake_by_entity_daily',
        signal
      ),
    enabled: days.length > 0 && entities.length > 0,
  });

  const totalsQuery = useQuery({
    ...fctValidatorCountByCredentialTypeDailyServiceListOptions({
      query: { day_start_date_in_values: dayValues, page_size: PAGE_SIZE },
    }),
    enabled: days.length > 0,
  });

  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const totals: (number | null)[] = days.map(() => null);
  for (const row of totalsQuery.data?.fct_validator_count_by_credential_type_daily ?? []) {
    const i = dayIndex.get(row.day_start_date ?? '');
    if (i === undefined) continue;
    totals[i] = (totals[i] ?? 0) + (row.active_effective_balance ?? 0) / GWEI;
  }

  // An entity missing from a day with a network total had no stake that day
  const byEntity = new Map(entities.map(e => [e, totals.map(t => (t === null ? null : 0)) as (number | null)[]]));
  for (const row of stake.data ?? []) {
    const series = byEntity.get(row.entity ?? '');
    const i = dayIndex.get(row.day_start_date ?? '');
    if (!series || i === undefined || series[i] === null) continue;
    series[i] = (series[i] ?? 0) + (row.active_effective_balance ?? 0) / GWEI;
  }

  return {
    days,
    byEntity,
    totals,
    isLoading: stake.isLoading || totalsQuery.isLoading,
    error: (stake.error ?? totalsQuery.error ?? null) as Error | null,
  };
}
