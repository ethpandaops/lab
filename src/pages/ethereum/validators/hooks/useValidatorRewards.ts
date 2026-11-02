import { useQuery } from '@tanstack/react-query';
import {
  fctAttestationRewardByValidatorDailyServiceListOptions,
  fctAttestationRewardByValidatorWeeklyServiceListOptions,
  fctSyncCommitteeRewardByValidatorDailyServiceListOptions,
  fctSyncCommitteeRewardByValidatorWeeklyServiceListOptions,
  fctBlockProposerRewardByValidatorDailyServiceListOptions,
  fctBlockProposerRewardByValidatorWeeklyServiceListOptions,
  fctValidatorEventServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctAttestationRewardByValidatorDaily,
  FctBlockProposerRewardByValidatorDaily,
  FctSyncCommitteeRewardByValidatorDaily,
} from '@/api/types.gen';

const GWEI = 1e9;
const PAGE = 10_000;

export interface RewardPeriod {
  /** First day of the period: the day, or the week's Monday */
  day: string;
  attestationEth: number;
  syncEth: number;
  proposerEth: number;
  /** Attestation and sync committee penalties, as a positive amount */
  penaltiesEth: number;
}

type WeekRow<T> = Omit<T, 'day_start_date'> & { week_start_date?: string };
const asDaily = <T>(rows: WeekRow<T>[] | undefined): T[] =>
  (rows ?? []).map(({ week_start_date, ...rest }) => ({ ...rest, day_start_date: week_start_date }) as T);

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
  const enabled = indices.length > 0 && from > 0;
  const validator_index_in_values = indices.join(',');
  const dayRange = {
    ...(allHistory ? { day_start_date_like: '20%' } : { day_start_date_in_values: periodKeys.join(',') }),
    page_size: PAGE,
  };
  const weekRange = {
    ...(allHistory ? { week_start_date_like: '20%' } : { week_start_date_in_values: periodKeys.join(',') }),
    page_size: PAGE,
  };
  const daily = { ...dayRange, validator_index_in_values };
  const weekly = { ...weekRange, validator_index_in_values };

  const attestation = useQuery({
    ...(resolution === 'day'
      ? fctAttestationRewardByValidatorDailyServiceListOptions({ query: daily })
      : fctAttestationRewardByValidatorWeeklyServiceListOptions({ query: weekly })),
    enabled,
  });
  const sync = useQuery({
    ...(resolution === 'day'
      ? fctSyncCommitteeRewardByValidatorDailyServiceListOptions({ query: daily })
      : fctSyncCommitteeRewardByValidatorWeeklyServiceListOptions({ query: weekly })),
    enabled,
  });
  const range = { slot_start_date_time_gte: from, slot_start_date_time_lte: to + 86_400, page_size: PAGE };
  const blocks = useQuery({
    ...(resolution === 'day'
      ? fctBlockProposerRewardByValidatorDailyServiceListOptions({
          query: { ...dayRange, proposer_index_in_values: validator_index_in_values },
        })
      : fctBlockProposerRewardByValidatorWeeklyServiceListOptions({
          query: { ...weekRange, proposer_index_in_values: validator_index_in_values },
        })),
    enabled,
  });
  const withdrawals = useQuery({
    ...fctValidatorEventServiceListOptions({
      query: { validator_index_in_values, event_type_in_values: 'withdrawal_partial,withdrawal_full', ...range },
    }),
    enabled,
  });

  const attestationRows: FctAttestationRewardByValidatorDaily[] =
    attestation.data && 'fct_attestation_reward_by_validator_daily' in attestation.data
      ? (attestation.data.fct_attestation_reward_by_validator_daily ?? [])
      : asDaily(
          (
            attestation.data as {
              fct_attestation_reward_by_validator_weekly?: WeekRow<FctAttestationRewardByValidatorDaily>[];
            }
          )?.fct_attestation_reward_by_validator_weekly
        );
  const syncRows: FctSyncCommitteeRewardByValidatorDaily[] =
    sync.data && 'fct_sync_committee_reward_by_validator_daily' in sync.data
      ? (sync.data.fct_sync_committee_reward_by_validator_daily ?? [])
      : asDaily(
          (
            sync.data as {
              fct_sync_committee_reward_by_validator_weekly?: WeekRow<FctSyncCommitteeRewardByValidatorDaily>[];
            }
          )?.fct_sync_committee_reward_by_validator_weekly
        );

  const byPeriod = new Map<string, RewardPeriod>();
  const at = (day: string): RewardPeriod => {
    const p = byPeriod.get(day) ?? { day, attestationEth: 0, syncEth: 0, proposerEth: 0, penaltiesEth: 0 };
    byPeriod.set(day, p);
    return p;
  };
  for (const r of attestationRows) {
    const p = at(r.day_start_date ?? '');
    // Penalties are stored as negative gwei; `total` is net of them
    const penalty = -Number(r.penalty ?? 0);
    p.attestationEth += (Number(r.total ?? 0) + penalty) / GWEI;
    p.penaltiesEth += penalty / GWEI;
  }
  for (const r of syncRows) {
    const p = at(r.day_start_date ?? '');
    p.syncEth += Number(r.reward ?? 0) / GWEI;
    p.penaltiesEth += -Number(r.penalty ?? 0) / GWEI;
  }
  const blockRows: FctBlockProposerRewardByValidatorDaily[] =
    blocks.data && 'fct_block_proposer_reward_by_validator_daily' in blocks.data
      ? (blocks.data.fct_block_proposer_reward_by_validator_daily ?? [])
      : asDaily(
          (
            blocks.data as {
              fct_block_proposer_reward_by_validator_weekly?: WeekRow<FctBlockProposerRewardByValidatorDaily>[];
            }
          )?.fct_block_proposer_reward_by_validator_weekly
        );
  for (const b of blockRows) at(b.day_start_date ?? '').proposerEth += Number(b.total ?? 0) / GWEI;
  const periods = [...byPeriod.values()].sort((a, b) => a.day.localeCompare(b.day));

  const all = [attestation, sync, blocks, withdrawals];
  return {
    periods,
    totalRewardEth: periods.reduce((a, p) => a + p.attestationEth + p.syncEth + p.proposerEth - p.penaltiesEth, 0),
    withdrawnEth: (withdrawals.data?.fct_validator_event ?? []).reduce((a, e) => a + Number(e.amount ?? 0) / GWEI, 0),
    isLoading: all.some(q => q.isLoading),
    error: (all.find(q => q.error)?.error ?? null) as Error | null,
  };
}
