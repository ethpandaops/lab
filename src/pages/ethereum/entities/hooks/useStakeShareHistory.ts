import { useQuery } from '@tanstack/react-query';

import { fctValidatorCountByCredentialTypeDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { fctValidatorStakeByEntityDailyServiceList } from '@/api/sdk.gen';
import type { FctValidatorStakeByEntityDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

import {
  ENTITY_TABLES,
  fctValidatorStakeByEntityGroupDailyList,
  type FctValidatorStakeByEntityGroupDaily,
} from '@/pages/ethereum/entities/api/entity-models';
import { groupId, isEntityGroup } from '@/pages/ethereum/entities/utils/groups';
import { daysBack } from '@/pages/ethereum/entities/utils/overview';

const GWEI = 1e9;
const PAGE_SIZE = 10_000;
/** Windows longer than this match every day instead of listing them */
const MAX_LISTED_DAYS = 400;

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
 * Stake over the window for a few entities or entity groups, next to the network total so the rest can be shown as
 * one band. Groups read their own daily table.
 */
export function useStakeShareHistory(
  entities: string[],
  firstDay: string | undefined,
  latestDay: string | undefined
): UseStakeShareHistoryResult {
  const { currentNetwork } = useNetwork();

  const days = firstDay && latestDay ? daysBack(firstDay, latestDay, 1) : [];
  const dayValues = days.join(',');
  // Long windows match every day instead of listing them, to keep the URL short; rows outside are dropped below
  const dayFilter =
    days.length > MAX_LISTED_DAYS ? { day_start_date_like: '20%' } : { day_start_date_in_values: dayValues };

  const single = entities.filter(e => !isEntityGroup(e));
  const groups = entities.filter(isEntityGroup);

  const stake = useQuery({
    queryKey: ['entities', 'stake-history', currentNetwork?.name, single.join(','), dayValues],
    queryFn: ({ signal }) =>
      fetchAllPages<FctValidatorStakeByEntityDaily>(
        fctValidatorStakeByEntityDailyServiceList,
        {
          query: { ...dayFilter, entity_in_values: single.join(','), page_size: PAGE_SIZE },
        },
        'fct_validator_stake_by_entity_daily',
        signal
      ),
    enabled: days.length > 0 && single.length > 0,
  });
  const groupStake = useQuery({
    queryKey: ['entities', 'group-stake-history', currentNetwork?.name, groups.join(','), dayValues],
    queryFn: ({ signal }) =>
      fetchAllPages<FctValidatorStakeByEntityGroupDaily>(
        fctValidatorStakeByEntityGroupDailyList,
        { query: { ...dayFilter, entity_group_in_values: groups.map(groupId).join(','), page_size: PAGE_SIZE } },
        ENTITY_TABLES.groupStake,
        signal
      ),
    enabled: days.length > 0 && groups.length > 0,
  });

  const totalsQuery = useQuery({
    ...fctValidatorCountByCredentialTypeDailyServiceListOptions({
      query: { ...dayFilter, page_size: PAGE_SIZE },
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
  const rows = [
    ...(stake.data ?? []),
    ...(groupStake.data ?? []).map(row => ({ ...row, entity: `*${row.entity_group ?? ''}` })),
  ];
  for (const row of rows) {
    const series = byEntity.get(row.entity ?? '');
    const i = dayIndex.get(row.day_start_date ?? '');
    if (!series || i === undefined || series[i] === null) continue;
    series[i] = (series[i] ?? 0) + (row.active_effective_balance ?? 0) / GWEI;
  }

  return {
    days,
    byEntity,
    totals,
    isLoading: stake.isLoading || groupStake.isLoading || totalsQuery.isLoading,
    error: (stake.error ?? groupStake.error ?? totalsQuery.error ?? null) as Error | null,
  };
}
