import { useQuery } from '@tanstack/react-query';
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

const GWEI = 1e9;
const PAGE = 10_000;

type ListFn = Parameters<typeof fetchAllPages>[0];

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
  periodKeys,
  allHistory,
}: {
  indices: number[];
  from: number;
  to: number;
  resolution: 'day' | 'week';
  /** Days (or Mondays) in the range; ignored when allHistory */
  periodKeys: string[];
  allHistory: boolean;
}): {
  periods: RewardPeriod[];
  totalRewardEth: number;
  withdrawnEth: number;
  isLoading: boolean;
  error: Error | null;
} {
  const { currentNetwork } = useNetwork();
  const enabled = indices.length > 0 && from > 0;
  const weekly = resolution === 'week';
  const column = weekly ? 'week_start_date' : 'day_start_date';
  const periodFilter = allHistory ? { [`${column}_like`]: '20%' } : { [`${column}_in_values`]: periodKeys.join(',') };
  // Validators per request, so a chunk's rows fit in about one page; page tokens pick up the rest
  const periodCount = allHistory ? Math.ceil((to - from) / 86_400 / (weekly ? 7 : 1)) + 1 : periodKeys.length;
  const chunkSize = Math.max(1, Math.floor(PAGE / Math.max(1, periodCount)));
  const chunks: string[] = [];
  for (let i = 0; i < indices.length; i += chunkSize) chunks.push(indices.slice(i, i + chunkSize).join(','));

  const { data, isLoading, error } = useQuery({
    queryKey: ['validator-rewards', currentNetwork?.name, resolution, chunks, periodFilter, from, to],
    queryFn: async ({ signal }) => {
      /** Every row for every chunk, with weekly rows keyed by their Monday like daily rows */
      const rows = async <T>(
        daily: ListFn,
        weeklyFn: ListFn,
        table: string,
        query: (ids: string) => Record<string, unknown>
      ): Promise<T[]> => {
        const name = `${table}_${resolution === 'week' ? 'weekly' : 'daily'}`;
        const pages = await Promise.all(
          chunks.map(ids =>
            fetchAllPages<T & { week_start_date?: string }>(
              weekly ? weeklyFn : daily,
              { query: { ...query(ids), ...periodFilter, page_size: PAGE, order_by: column } },
              name,
              signal
            )
          )
        );
        return pages
          .flat()
          .map(({ week_start_date, ...rest }) =>
            week_start_date === undefined ? (rest as T) : ({ ...rest, day_start_date: week_start_date } as T)
          );
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
                  slot_start_date_time_lte: to + 86_400,
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
