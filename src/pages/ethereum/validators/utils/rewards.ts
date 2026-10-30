/**
 * PROTOTYPE: consensus reward estimates until xatu-cbt has per-validator reward tables. Per-duty
 * rewards use spec weights, with the total active balance from the overview fixture's beacon state
 * snapshot. Daily rewards come from balance changes: drops while above the withdrawal threshold are
 * treated as sweeps, and the rest is split into duties using real sync committee and proposal counts.
 */
import type {
  FctBlockProposerByValidator,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';
import { fixture } from '../mocks/overview';

const GWEI = 1e9;

/** Spec participation weights (out of 64) */
const WEIGHT_SOURCE = 14;
const WEIGHT_TARGET = 26;
const WEIGHT_HEAD = 14;
const WEIGHT_SYNC = 2;
const WEIGHT_DENOMINATOR = 64;

const TOTAL_ACTIVE_ETH = fixture.snapshot.byCredentialStatus
  .filter(r => r.status.startsWith('active_'))
  .reduce((a, r) => a + r.effectiveBalanceEth, 0);
/** base_reward_per_increment = 1 ETH * BASE_REWARD_FACTOR / isqrt(total active balance in gwei) */
const BASE_REWARD_PER_INCREMENT_GWEI = (GWEI * 64) / Math.floor(Math.sqrt(TOTAL_ACTIVE_ETH * GWEI));

/** Reward (or penalty) for one sync committee slot, the same for every member */
export const SYNC_REWARD_PER_SLOT_GWEI = Math.round(
  (BASE_REWARD_PER_INCREMENT_GWEI * Math.floor(TOTAL_ACTIVE_ETH) * WEIGHT_SYNC) / WEIGHT_DENOMINATOR / 32 / 512
);

/**
 * Estimated consensus reward for one attestation duty, in gwei. Uses spec weights and timeliness rules
 * (source within 5 slots, head only at distance 1); assumes full network participation.
 */
export function attestationRewardGwei({
  effectiveBalanceEth,
  attested,
  sourceCorrect,
  targetCorrect,
  headCorrect,
  inclusionDistance,
}: {
  effectiveBalanceEth: number;
  attested: boolean;
  sourceCorrect: boolean | null;
  targetCorrect: boolean | null;
  headCorrect: boolean | null;
  inclusionDistance: number | null;
}): number {
  const base = Math.floor(effectiveBalanceEth) * BASE_REWARD_PER_INCREMENT_GWEI;
  const part = (weight: number): number => (base * weight) / WEIGHT_DENOMINATOR;
  const delay = inclusionDistance ?? Infinity;
  const source = attested && sourceCorrect === true && delay <= 5 ? part(WEIGHT_SOURCE) : -part(WEIGHT_SOURCE);
  const target = attested && targetCorrect === true ? part(WEIGHT_TARGET) : -part(WEIGHT_TARGET);
  const head = attested && headCorrect === true && delay === 1 ? part(WEIGHT_HEAD) : 0;
  return Math.round(source + target + head);
}

const SYNC_REWARD_PER_SLOT_ETH = SYNC_REWARD_PER_SLOT_GWEI / GWEI;

/** Approximate consensus reward per canonical proposal */
const PROPOSER_REWARD_ETH = 0.038;

export interface RewardDay {
  day: string;
  attestationEth: number;
  syncEth: number;
  proposerEth: number;
  withdrawnEth: number;
}

export interface WithdrawalEvent {
  day: string;
  validatorIndex: number;
  amountEth: number;
}

export function estimateRewards(
  balances: FctValidatorBalanceDaily[],
  sync: FctSyncCommitteeParticipationByValidatorDaily[],
  proposals: FctBlockProposerByValidator[],
  /** Maps a proposal's day to the row key it belongs to, e.g. its week start for weekly rows */
  bucket: (day: string) => string = day => day
): { days: RewardDay[]; withdrawals: WithdrawalEvent[] } {
  const syncByKey = new Map(sync.map(s => [`${s.validator_index}:${s.day_start_date}`, s.participated_count ?? 0]));
  const proposalsByKey = new Map<string, number>();
  for (const p of proposals) {
    if (p.status !== 'canonical') continue;
    const day = bucket(new Date((p.slot_start_date_time ?? 0) * 1000).toISOString().slice(0, 10));
    const key = `${p.validator_index}:${day}`;
    proposalsByKey.set(key, (proposalsByKey.get(key) ?? 0) + 1);
  }

  const byValidator = new Map<number, FctValidatorBalanceDaily[]>();
  for (const b of balances) {
    const list = byValidator.get(b.validator_index ?? 0) ?? [];
    list.push(b);
    byValidator.set(b.validator_index ?? 0, list);
  }

  const totals = new Map<string, RewardDay>();
  const withdrawals: WithdrawalEvent[] = [];
  for (const [validatorIndex, rows] of byValidator) {
    rows.sort((a, b) => (a.day_start_date ?? '').localeCompare(b.day_start_date ?? ''));
    let prevEnd: number | null = null;
    for (const r of rows) {
      const day = r.day_start_date ?? '';
      const start = prevEnd ?? r.start_balance ?? 0;
      const end = r.end_balance ?? 0;
      const max = Math.max(r.max_balance ?? end, start);
      // The post-sweep level: the row's minimum, but never below the effective balance, so a row that
      // also holds a deposit or consolidation doesn't read the pre-deposit balance as the sweep floor
      const min = Math.max(Math.min(r.min_balance ?? start, start, end), Math.min(r.effective_balance ?? 0, end));
      // A sweep takes the balance from its peak down to the effective balance (the row's minimum), then
      // rewards accrue again. Assumes at most one sweep per row: mainnet sweeps come round every 9+ days.
      const swept =
        (end < max - 0.0005 * GWEI || min < start - 0.0005 * GWEI) && (r.effective_balance ?? 0) >= 32 * GWEI;
      const withdrawn = swept ? max - min : 0;
      prevEnd = end;

      const syncEth = (syncByKey.get(`${validatorIndex}:${day}`) ?? 0) * SYNC_REWARD_PER_SLOT_ETH;
      const proposerEth = (proposalsByKey.get(`${validatorIndex}:${day}`) ?? 0) * PROPOSER_REWARD_ETH;
      // A rise beyond what duties could earn (10% APR plus the counted sync and proposer rewards) is a
      // deposit, top-up or consolidation, not income; those rows count only their sync and proposer rewards
      const rowDays =
        r.start_epoch !== undefined && r.end_epoch !== undefined
          ? ((r.end_epoch - r.start_epoch + 1) * 384) / 86_400
          : 1;
      const ceiling = (((r.effective_balance ?? 0) / GWEI) * 0.1 * rowDays) / 365 + syncEth + proposerEth;
      const change = (swept ? max - start + (end - min) : end - start) / GWEI;
      const income = change > ceiling ? syncEth + proposerEth : change;
      const total = totals.get(day) ?? { day, attestationEth: 0, syncEth: 0, proposerEth: 0, withdrawnEth: 0 };
      total.syncEth += syncEth;
      total.proposerEth += proposerEth;
      total.attestationEth += income - syncEth - proposerEth;
      total.withdrawnEth += withdrawn / GWEI;
      totals.set(day, total);
      if (withdrawn > 0) withdrawals.push({ day, validatorIndex, amountEth: withdrawn / GWEI });
    }
  }

  return { days: [...totals.values()].sort((a, b) => a.day.localeCompare(b.day)), withdrawals };
}
