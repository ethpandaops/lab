import { useMemo } from 'react';
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

const GWEI = 1e9;

export interface EntityStakeDay {
  day: string;
  /** Active effective balance, in ETH */
  stakeEth: number;
  validators: number;
}

export interface UseEntityStakeHistoryResult {
  /** Every day the entity had active stake, oldest first */
  days: EntityStakeDay[];
  /** The newest day, with the entity's share of all active stake that day */
  latest?: EntityStakeDay & { share: number | null };
  isLoading: boolean;
  error: Error | null;
}

/**
 * An entity's or entity group's active stake and validators on every day, and its share of all stake on the newest
 * one. Groups read their own daily table.
 */
export function useEntityStakeHistory(entity: string): UseEntityStakeHistoryResult {
  const { currentNetwork } = useNetwork();
  const group = isEntityGroup(entity);
  const stake = useQuery({
    queryKey: ['entities', 'entity-stake', currentNetwork?.name, entity],
    queryFn: ({ signal }): Promise<Array<FctValidatorStakeByEntityDaily | FctValidatorStakeByEntityGroupDaily>> =>
      group
        ? fetchAllPages<FctValidatorStakeByEntityGroupDaily>(
            fctValidatorStakeByEntityGroupDailyList,
            // The daily table only filters its date key by value; every date starts with 20
            { query: { entity_group_eq: groupId(entity), day_start_date_like: '20%', page_size: 10_000 } },
            ENTITY_TABLES.groupStake,
            signal
          )
        : fetchAllPages<FctValidatorStakeByEntityDaily>(
            fctValidatorStakeByEntityDailyServiceList,
            { query: { entity_eq: entity, day_start_date_like: '20%', page_size: 10_000 } },
            'fct_validator_stake_by_entity_daily',
            signal
          ),
    enabled: !!currentNetwork && entity.length > 0,
  });

  const days = useMemo(() => {
    const byDay = new Map<string, EntityStakeDay>();
    for (const row of stake.data ?? []) {
      const day = row.day_start_date ?? '';
      const entry = byDay.get(day) ?? { day, stakeEth: 0, validators: 0 };
      entry.stakeEth += (row.active_effective_balance ?? 0) / GWEI;
      entry.validators += row.active_validator_count ?? 0;
      byDay.set(day, entry);
    }
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [stake.data]);

  const newest = days[days.length - 1];
  const totals = useQuery({
    ...fctValidatorCountByCredentialTypeDailyServiceListOptions({
      query: { day_start_date_eq: newest?.day ?? '', page_size: 10 },
    }),
    enabled: !!newest,
  });
  const totalEth = (totals.data?.fct_validator_count_by_credential_type_daily ?? []).reduce(
    (sum, row) => sum + (row.active_effective_balance ?? 0) / GWEI,
    0
  );

  return {
    days,
    latest: newest && { ...newest, share: totalEth > 0 ? newest.stakeEth / totalEth : null },
    isLoading: stake.isLoading || (!!newest && totals.isLoading),
    error: (stake.error ?? totals.error ?? null) as Error | null,
  };
}
