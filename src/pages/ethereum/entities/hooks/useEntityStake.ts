import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fctValidatorCountByCredentialTypeDailyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { fctValidatorStakeByEntityDailyServiceList } from '@/api/sdk.gen';
import type { FctValidatorStakeByEntityDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';

import { ENTITIES_WINDOW_DAYS, type EntitiesWindow } from '../constants';
import { addDays, dayOf, sampleDays } from '../utils/overview';

const GWEI = 1e9;
const PAGE_SIZE = 10_000;
/** Sample days per window: enough for a trend line without loading every day for every entity */
const SAMPLE_POINTS = 13;

export interface EntityStake {
  entity: string;
  /** Active validators on the latest day */
  validators: number;
  /** Active effective balance on the latest day, in ETH */
  stakeEth: number;
  /** Part of `stakeEth` behind compounding (0x02) credentials */
  compoundingEth: number;
  /** Stake on each sample day, in ETH; null for a day the table has no rows for */
  series: (number | null)[];
  /** Stake on `startDay`, in ETH */
  startEth: number;
  /** Stake gained (or lost) from `startDay` to the latest day */
  changeEth: number;
}

export interface UseEntityStakeResult {
  /** Newest day of validator data */
  latestDay: string | undefined;
  /** First day of the window */
  firstDay: string | undefined;
  /** Days the entity series sample, oldest first */
  days: string[];
  /** First sample day the table has rows for: the window's start, or the earliest data inside it */
  startDay: string | undefined;
  /** Every entity with stake on a sample day, largest stake first */
  entities: EntityStake[];
  totalStakeEth: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Stake and validator counts per entity on the latest day, plus each entity's stake on evenly spaced days
 * across the window.
 */
export function useEntityStake(window: EntitiesWindow): UseEntityStakeResult {
  const { currentNetwork } = useNetwork();

  // Shares its query with the validators overview
  const latest = useQuery(
    fctValidatorCountByCredentialTypeDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: 3 },
    })
  );
  const latestDay = latest.data?.fct_validator_count_by_credential_type_daily?.[0]?.day_start_date;

  const genesisDay = currentNetwork ? dayOf(currentNetwork.genesis_time) : undefined;
  const windowDays = ENTITIES_WINDOW_DAYS[window];
  const firstDay =
    latestDay && genesisDay
      ? windowDays === null
        ? genesisDay
        : [genesisDay, addDays(latestDay, -windowDays)].sort()[1]
      : undefined;
  const days = latestDay && firstDay ? sampleDays(firstDay, latestDay, SAMPLE_POINTS) : [];

  const stake = useQuery({
    queryKey: ['entities', 'stake', currentNetwork?.name, days.join(',')],
    queryFn: async ({ signal }) => ({
      days,
      rows: await fetchAllPages<FctValidatorStakeByEntityDaily>(
        fctValidatorStakeByEntityDailyServiceList,
        { query: { day_start_date_in_values: days.join(','), page_size: PAGE_SIZE } },
        'fct_validator_stake_by_entity_daily',
        signal
      ),
    }),
    enabled: days.length > 0,
    placeholderData: keepPreviousData,
  });

  // Built from the days the data was loaded for, so the previous window stays on screen while the next loads.
  // Memoised so consumers get stable references between renders.
  const { entities, startDay } = useMemo(() => {
    const days = stake.data?.days ?? [];
    const dayIndex = new Map(days.map((d, i) => [d, i]));
    const daysWithRows = new Set<number>();
    const byEntity = new Map<string, EntityStake>();
    for (const row of stake.data?.rows ?? []) {
      const i = dayIndex.get(row.day_start_date ?? '');
      if (i === undefined) continue;
      daysWithRows.add(i);
      const name = row.entity || 'unknown';
      const entity =
        byEntity.get(name) ??
        ({
          entity: name,
          validators: 0,
          stakeEth: 0,
          compoundingEth: 0,
          series: days.map(() => 0),
          startEth: 0,
          changeEth: 0,
        } satisfies EntityStake);
      const eth = (row.active_effective_balance ?? 0) / GWEI;
      (entity.series as number[])[i] += eth;
      if (i === days.length - 1) {
        entity.validators += row.active_validator_count ?? 0;
        entity.stakeEth += eth;
        if (row.credential_type === '0x02') entity.compoundingEth += eth;
      }
      byEntity.set(name, entity);
    }

    const firstWithRows = days.findIndex((_, i) => daysWithRows.has(i));
    const entities = [...byEntity.values()].map(e => {
      const series = e.series.map((v, i) => (daysWithRows.has(i) ? v : null));
      const startEth = series[firstWithRows] ?? 0;
      return { ...e, series, startEth, changeEth: e.stakeEth - startEth };
    });
    return {
      entities: entities.sort((a, b) => b.stakeEth - a.stakeEth),
      startDay: firstWithRows === -1 ? undefined : days[firstWithRows],
    };
  }, [stake.data]);

  return {
    latestDay,
    firstDay,
    days: stake.data?.days ?? [],
    startDay,
    entities,
    totalStakeEth: entities.reduce((sum, e) => sum + e.stakeEth, 0),
    isLoading: latest.isLoading || stake.isLoading,
    error: (latest.error ?? stake.error ?? null) as Error | null,
  };
}
