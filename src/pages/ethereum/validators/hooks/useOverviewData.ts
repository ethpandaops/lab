import { useQuery } from '@tanstack/react-query';
import {
  fctValidatorCountByCredentialTypeDailyServiceListOptions,
  fctValidatorCountByCredentialTypeWeeklyServiceListOptions,
  fctValidatorQueueDailyServiceListOptions,
  fctValidatorQueueWeeklyServiceListOptions,
  fctValidatorOperationDailyServiceListOptions,
  fctValidatorOperationWeeklyServiceListOptions,
  fctValidatorRewardTotalDailyServiceListOptions,
  fctValidatorRewardTotalWeeklyServiceListOptions,
  fctValidatorEffectiveBalanceByCredentialTypeDailyServiceListOptions,
  fctValidatorStakeByEntityDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctValidatorCountByCredentialTypeDaily,
  FctValidatorQueueDaily,
  FctValidatorOperationDaily,
  FctValidatorRewardTotalDaily,
  FctValidatorEffectiveBalanceByCredentialTypeDaily,
  FctValidatorStakeByEntityDaily,
} from '@/api/types.gen';
import { CREDENTIAL_TYPES, type CredentialType, type OverviewWindow } from '../utils/overview';
import { weekStartOf } from '../utils/week';

const GWEI = 1e9;
const DAY = 86_400;
const PAGE = 10_000;

export interface OverviewPeriod {
  /** First day of the period (YYYY-MM-DD): the day, or the week's Monday */
  day: string;
  /** Days the period covers so far (7 for a complete week) */
  dayCount: number;
  /** Validator counts at the period's last complete epoch */
  status: { pending: number; active: number; exiting: number; exited: number };
  /** Active validators and their effective balance (ETH) per credential type, at the period's last epoch */
  credential: Record<CredentialType, { count: number; effectiveBalanceEth: number }>;
  /** ETH waiting to activate (activation queue plus pending deposits) and to exit, at the period's last epoch */
  activationQueueEth: number | null;
  exitQueueEth: number | null;
  /** Operations included on chain during the period */
  ops: Record<string, { count: number; amountEth: number }>;
  /** Consensus rewards paid during the period, in ETH */
  rewards: { attestationEth: number; syncEth: number; proposerEth: number; penaltiesEth: number } | null;
}

export interface OverviewSnapshot {
  day: string;
  epoch: number;
  byType: Record<CredentialType, { count: number; stake: number }>;
  queue: FctValidatorQueueDaily | null;
  histogram: FctValidatorEffectiveBalanceByCredentialTypeDaily[];
  entities: FctValidatorStakeByEntityDaily[];
}

/** Windows of at most this many days load daily rows; longer ones load weekly rows */
const DAILY_WINDOW_DAYS: Partial<Record<OverviewWindow, number>> = { '30d': 30, '90d': 90 };
const WEEKLY_WINDOW_DAYS: Partial<Record<OverviewWindow, number>> = { '1y': 365, '2y': 730 };

function lastDays(n: number): string[] {
  const today = Math.floor(Date.now() / 1000 / DAY) * DAY;
  return Array.from({ length: n }, (_, i) => new Date((today - (n - 1 - i) * DAY) * 1000).toISOString().slice(0, 10));
}

type WeekRow<T> = Omit<T, 'day_start_date'> & { week_start_date?: string };
const asDaily = <T>(rows: WeekRow<T>[] | undefined): T[] =>
  (rows ?? []).map(({ week_start_date, ...rest }) => ({ ...rest, day_start_date: week_start_date }) as T);

const emptyCredential = (): OverviewPeriod['credential'] =>
  Object.fromEntries(
    CREDENTIAL_TYPES.map(ct => [ct, { count: 0, effectiveBalanceEth: 0 }])
  ) as OverviewPeriod['credential'];

/**
 * Network validator series for the overview, one row per day (30d, 90d) or per week (longer windows),
 * plus the latest snapshot. Every value comes from the xatu-cbt validator tables.
 */
export function useOverviewData(window: OverviewWindow): {
  period: 'day' | 'week';
  periods: OverviewPeriod[];
  snapshot: OverviewSnapshot | null;
  isLoading: boolean;
  error: Error | null;
} {
  const dailyDays = DAILY_WINDOW_DAYS[window];
  const period = dailyDays !== undefined ? 'day' : 'week';
  const weeklyDays = WEEKLY_WINDOW_DAYS[window];
  const dayFilter = dailyDays !== undefined ? { day_start_date_in_values: lastDays(dailyDays).join(',') } : {};
  const weekFilter =
    weeklyDays !== undefined
      ? { week_start_date_in_values: [...new Set(lastDays(weeklyDays).map(weekStartOf))].join(',') }
      : { week_start_date_like: '20%' };
  const daily = { ...dayFilter, page_size: PAGE, order_by: 'day_start_date' };
  const weekly = { ...weekFilter, page_size: PAGE, order_by: 'week_start_date' };

  const counts = useQuery(
    period === 'day'
      ? fctValidatorCountByCredentialTypeDailyServiceListOptions({ query: daily })
      : fctValidatorCountByCredentialTypeWeeklyServiceListOptions({ query: weekly })
  );
  const queues = useQuery(
    period === 'day'
      ? fctValidatorQueueDailyServiceListOptions({ query: daily })
      : fctValidatorQueueWeeklyServiceListOptions({ query: weekly })
  );
  const operations = useQuery(
    period === 'day'
      ? fctValidatorOperationDailyServiceListOptions({ query: daily })
      : fctValidatorOperationWeeklyServiceListOptions({ query: weekly })
  );
  const rewards = useQuery(
    period === 'day'
      ? fctValidatorRewardTotalDailyServiceListOptions({ query: daily })
      : fctValidatorRewardTotalWeeklyServiceListOptions({ query: weekly })
  );

  // Snapshot tables: the newest day only
  const latestCounts = useQuery(
    fctValidatorCountByCredentialTypeDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: CREDENTIAL_TYPES.length },
    })
  );
  const latestDay = latestCounts.data?.fct_validator_count_by_credential_type_daily?.[0]?.day_start_date;
  const latestQueue = useQuery({
    ...fctValidatorQueueDailyServiceListOptions({ query: { day_start_date_eq: latestDay } }),
    enabled: !!latestDay,
  });
  const histogram = useQuery({
    ...fctValidatorEffectiveBalanceByCredentialTypeDailyServiceListOptions({
      query: { day_start_date_eq: latestDay, page_size: PAGE },
    }),
    enabled: !!latestDay,
  });
  const entities = useQuery({
    ...fctValidatorStakeByEntityDailyServiceListOptions({
      query: { day_start_date_eq: latestDay, page_size: PAGE },
    }),
    enabled: !!latestDay,
  });

  const countRows: FctValidatorCountByCredentialTypeDaily[] =
    counts.data && 'fct_validator_count_by_credential_type_daily' in counts.data
      ? (counts.data.fct_validator_count_by_credential_type_daily ?? [])
      : asDaily(
          (
            counts.data as {
              fct_validator_count_by_credential_type_weekly?: WeekRow<FctValidatorCountByCredentialTypeDaily>[];
            }
          )?.fct_validator_count_by_credential_type_weekly
        );
  const queueRows: FctValidatorQueueDaily[] =
    queues.data && 'fct_validator_queue_daily' in queues.data
      ? (queues.data.fct_validator_queue_daily ?? [])
      : asDaily(
          (queues.data as { fct_validator_queue_weekly?: WeekRow<FctValidatorQueueDaily>[] })
            ?.fct_validator_queue_weekly
        );
  const operationRows: FctValidatorOperationDaily[] =
    operations.data && 'fct_validator_operation_daily' in operations.data
      ? (operations.data.fct_validator_operation_daily ?? [])
      : asDaily(
          (operations.data as { fct_validator_operation_weekly?: WeekRow<FctValidatorOperationDaily>[] })
            ?.fct_validator_operation_weekly
        );
  const rewardRows: FctValidatorRewardTotalDaily[] =
    rewards.data && 'fct_validator_reward_total_daily' in rewards.data
      ? (rewards.data.fct_validator_reward_total_daily ?? [])
      : asDaily(
          (rewards.data as { fct_validator_reward_total_weekly?: WeekRow<FctValidatorRewardTotalDaily>[] })
            ?.fct_validator_reward_total_weekly
        );

  // The count snapshots define which periods exist; other series join onto them
  const byDay = new Map<string, OverviewPeriod>();
  const today = new Date().toISOString().slice(0, 10);
  for (const r of countRows) {
    const day = r.day_start_date ?? '';
    const p =
      byDay.get(day) ??
      ({
        day,
        dayCount:
          period === 'day'
            ? 1
            : Math.min(
                7,
                Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000) + 1
              ),
        status: { pending: 0, active: 0, exiting: 0, exited: 0 },
        credential: emptyCredential(),
        activationQueueEth: null,
        exitQueueEth: null,
        ops: {},
        rewards: null,
      } satisfies OverviewPeriod);
    const ct = r.credential_type as CredentialType;
    p.status.pending += r.pending_validator_count ?? 0;
    p.status.active += r.active_validator_count ?? 0;
    p.status.exiting += r.exiting_validator_count ?? 0;
    p.status.exited += r.exited_validator_count ?? 0;
    if (p.credential[ct]) {
      p.credential[ct].count += r.active_validator_count ?? 0;
      p.credential[ct].effectiveBalanceEth += (r.active_effective_balance ?? 0) / GWEI;
    }
    byDay.set(day, p);
  }
  for (const q of queueRows) {
    const p = byDay.get(q.day_start_date ?? '');
    if (!p) continue;
    p.activationQueueEth = ((q.activation_queue_effective_balance ?? 0) + (q.pending_deposit_amount ?? 0)) / GWEI;
    p.exitQueueEth = (q.exit_queue_effective_balance ?? 0) / GWEI;
  }
  for (const o of operationRows) {
    const p = byDay.get(o.day_start_date ?? '');
    if (!p || !o.operation) continue;
    p.ops[o.operation] = { count: o.operation_count ?? 0, amountEth: (o.amount ?? 0) / GWEI };
  }
  for (const r of rewardRows) {
    const p = byDay.get(r.day_start_date ?? '');
    if (!p) continue;
    // Penalties are stored as negative gwei and `attestation_total` is net of them
    const attestationPenalty = -(r.attestation_penalty ?? 0);
    const syncPenalty = -(r.sync_committee_penalty ?? 0);
    p.rewards = {
      attestationEth: ((r.attestation_total ?? 0) + attestationPenalty) / GWEI,
      syncEth: (r.sync_committee_reward ?? 0) / GWEI,
      proposerEth: (r.proposer_total ?? 0) / GWEI,
      penaltiesEth: (attestationPenalty + syncPenalty) / GWEI,
    };
  }
  const periods = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  const latestRows = latestCounts.data?.fct_validator_count_by_credential_type_daily ?? [];
  const snapshot: OverviewSnapshot | null = latestDay
    ? {
        day: latestDay,
        epoch: latestRows[0]?.epoch ?? 0,
        byType: Object.fromEntries(
          CREDENTIAL_TYPES.map(ct => {
            const row = latestRows.find(r => r.credential_type === ct);
            return [
              ct,
              { count: row?.active_validator_count ?? 0, stake: (row?.active_effective_balance ?? 0) / GWEI },
            ];
          })
        ) as OverviewSnapshot['byType'],
        queue: latestQueue.data?.fct_validator_queue_daily?.[0] ?? null,
        histogram: histogram.data?.fct_validator_effective_balance_by_credential_type_daily ?? [],
        entities: entities.data?.fct_validator_stake_by_entity_daily ?? [],
      }
    : null;

  const all = [counts, queues, operations, rewards, latestCounts, latestQueue, histogram, entities];
  return {
    period,
    periods,
    snapshot,
    isLoading: all.some(q => q.isLoading),
    error: (all.find(q => q.error)?.error ?? null) as Error | null,
  };
}
