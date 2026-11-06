import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fctAttestationRewardByValidatorDailyServiceList,
  fctAttestationRewardByValidatorWeeklyServiceList,
  fctSyncCommitteeRewardByValidatorDailyServiceList,
  fctSyncCommitteeRewardByValidatorWeeklyServiceList,
  fctBlockProposerRewardByValidatorDailyServiceList,
  fctBlockProposerRewardByValidatorWeeklyServiceList,
  fctValidatorEventServiceList,
} from '@/api/sdk.gen';
import type {
  FctAttestationRewardByValidatorDaily,
  FctBlockProposerRewardByValidatorDaily,
  FctSyncCommitteeRewardByValidatorDaily,
  FctValidatorEvent,
} from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { rollupPeriods } from '../utils/range';
import { weekStartOf } from '../utils/week';

const GWEI = 1e9;
const PAGE = 10_000;
/** Validators per request, so the index list keeps the URL short; page tokens fetch the rows beyond one page */
const VALIDATORS_PER_REQUEST = 250;

/** Mondays per weekly request, about six years; with 250 validators the URL stays near 6 KB */
const WEEKS_PER_REQUEST = 320;

type ListFn = Parameters<typeof fetchAllPages>[0];

function chunkList<T>(list: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
}

export interface RewardPeriod {
  /** First day of the period: the day, or the week's Monday */
  day: string;
  attestationEth: number;
  syncEth: number;
  proposerEth: number;
  /** Attestation and sync committee penalties, as a positive amount */
  penaltiesEth: number;
}

/**
 * Consensus rewards and withdrawals for a set of validators, per day or per week, as recorded by the
 * beacon node's rewards APIs and the chain.
 */
export function useValidatorRewards({
  indices,
  from,
  to,
  resolution,
  enabled: wanted,
}: {
  indices: number[];
  /** Range start and end day (unix seconds, start of day UTC); the end day is included */
  from: number;
  to: number;
  /** Per day, or per week: whole weeks from the weekly rollups, the days around them added up into partial weeks */
  resolution: 'day' | 'week';
  /** Load only while the rewards are shown */
  enabled: boolean;
}): {
  periods: RewardPeriod[];
  totalRewardEth: number;
  withdrawnEth: number;
  isLoading: boolean;
  error: Error | null;
} {
  const { currentNetwork } = useNetwork();
  const enabled = wanted && indices.length > 0 && from > 0;
  const weekly = resolution === 'week';
  const chunks: string[] = [];
  for (let i = 0; i < indices.length; i += VALIDATORS_PER_REQUEST) {
    chunks.push(indices.slice(i, i + VALIDATORS_PER_REQUEST).join(','));
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['validator-rewards', currentNetwork?.name, resolution, chunks, from, to],
    queryFn: async ({ signal }) => {
      // Every request lists its days or weeks, so each one has a start and an end
      const { weeks, days } = rollupPeriods(from, to, weekly);
      const lists = [
        ...chunkList(weeks, WEEKS_PER_REQUEST).map(list => ({ weekly: true, list })),
        ...(days.length > 0 ? [{ weekly: false, list: days }] : []),
      ];
      /** Every row for every chunk, keyed by its day, or at weekly grain by its week's Monday */
      const rows = async <T>(
        daily: ListFn,
        weeklyFn: ListFn,
        table: string,
        query: (ids: string) => Record<string, unknown>
      ): Promise<T[]> => {
        const pages = await Promise.all(
          lists.flatMap(period =>
            chunks.map(ids => {
              const column = period.weekly ? 'week_start_date' : 'day_start_date';
              return fetchAllPages<T & { day_start_date?: string; week_start_date?: string }>(
                period.weekly ? weeklyFn : daily,
                {
                  query: {
                    ...query(ids),
                    [`${column}_in_values`]: period.list.join(','),
                    page_size: PAGE,
                    order_by: column,
                  },
                },
                `${table}_${period.weekly ? 'weekly' : 'daily'}`,
                signal
              );
            })
          )
        );
        return pages.flat().map(({ week_start_date, ...rest }) => {
          const day = week_start_date ?? rest.day_start_date ?? '';
          return { ...rest, day_start_date: weekly ? weekStartOf(day) : day } as T;
        });
      };
      const [attestation, sync, blocks, withdrawals] = await Promise.all([
        rows<FctAttestationRewardByValidatorDaily>(
          fctAttestationRewardByValidatorDailyServiceList as ListFn,
          fctAttestationRewardByValidatorWeeklyServiceList as ListFn,
          'fct_attestation_reward_by_validator',
          ids => ({ validator_index_in_values: ids })
        ),
        rows<FctSyncCommitteeRewardByValidatorDaily>(
          fctSyncCommitteeRewardByValidatorDailyServiceList as ListFn,
          fctSyncCommitteeRewardByValidatorWeeklyServiceList as ListFn,
          'fct_sync_committee_reward_by_validator',
          ids => ({ validator_index_in_values: ids })
        ),
        rows<FctBlockProposerRewardByValidatorDaily>(
          fctBlockProposerRewardByValidatorDailyServiceList as ListFn,
          fctBlockProposerRewardByValidatorWeeklyServiceList as ListFn,
          'fct_block_proposer_reward_by_validator',
          ids => ({ proposer_index_in_values: ids })
        ),
        Promise.all(
          chunks.map(ids =>
            fetchAllPages<FctValidatorEvent>(
              fctValidatorEventServiceList as ListFn,
              {
                query: {
                  validator_index_in_values: ids,
                  event_type_in_values: 'withdrawal_partial,withdrawal_full',
                  slot_start_date_time_gte: from,
                  slot_start_date_time_lt: to + 86_400,
                  page_size: PAGE,
                  order_by: 'slot_start_date_time',
                },
              },
              'fct_validator_event',
              signal
            )
          )
        ).then(pages => pages.flat()),
      ]);
      return { attestation, sync, blocks, withdrawals };
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  const byPeriod = new Map<string, RewardPeriod>();
  const at = (day: string): RewardPeriod => {
    const p = byPeriod.get(day) ?? { day, attestationEth: 0, syncEth: 0, proposerEth: 0, penaltiesEth: 0 };
    byPeriod.set(day, p);
    return p;
  };
  for (const r of data?.attestation ?? []) {
    const p = at(r.day_start_date ?? '');
    // Penalties are stored as negative gwei; `total` is net of them
    const penalty = -Number(r.penalty ?? 0);
    p.attestationEth += (Number(r.total ?? 0) + penalty) / GWEI;
    p.penaltiesEth += penalty / GWEI;
  }
  for (const r of data?.sync ?? []) {
    const p = at(r.day_start_date ?? '');
    p.syncEth += Number(r.reward ?? 0) / GWEI;
    p.penaltiesEth += -Number(r.penalty ?? 0) / GWEI;
  }
  for (const b of data?.blocks ?? []) at(b.day_start_date ?? '').proposerEth += Number(b.total ?? 0) / GWEI;
  const periods = [...byPeriod.values()].sort((a, b) => a.day.localeCompare(b.day));

  return {
    periods,
    totalRewardEth: periods.reduce((a, p) => a + p.attestationEth + p.syncEth + p.proposerEth - p.penaltiesEth, 0),
    withdrawnEth: (data?.withdrawals ?? []).reduce((a, e) => a + Number(e.amount ?? 0) / GWEI, 0),
    isLoading,
    error: error as Error | null,
  };
}
