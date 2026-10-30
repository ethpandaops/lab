/**
 * PROTOTYPE: rolls daily per-validator rows up to weeks in the browser. The weekly tables
 * (fct_*_by_validator_weekly, fct_validator_balance_weekly) are being added to xatu-cbt; once the API
 * serves them, query those instead and delete this file. Rows keep the daily shape, with
 * `day_start_date` set to the week's Monday (UTC), so every consumer works unchanged.
 */
import type {
  FctAttestationVoteCorrectnessByValidatorDaily,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';

const DAY_MS = 86_400_000;

/** Monday (UTC) of the week containing `day` (YYYY-MM-DD) */
export function weekStartOf(day: string): string {
  const ms = Date.parse(`${day}T00:00:00Z`);
  const daysSinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return new Date(ms - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

function groupByValidatorWeek<T extends { validator_index?: number; day_start_date?: string }>(
  rows: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = `${row.validator_index}:${weekStartOf(row.day_start_date ?? '')}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

const sum = <T>(rows: T[], pick: (row: T) => number | null | undefined): number =>
  rows.reduce((total, row) => total + (pick(row) ?? 0), 0);

export function weeklyAttestation(
  rows: FctAttestationVoteCorrectnessByValidatorDaily[]
): FctAttestationVoteCorrectnessByValidatorDaily[] {
  return [...groupByValidatorWeek(rows).values()].map(days => {
    const attested = sum(days, d => d.attested_count);
    const weightedDistance = sum(days, d => (d.avg_inclusion_distance ?? 0) * (d.attested_count ?? 0));
    return {
      validator_index: days[0].validator_index,
      day_start_date: weekStartOf(days[0].day_start_date ?? ''),
      total_duties: sum(days, d => d.total_duties),
      attested_count: attested,
      missed_count: sum(days, d => d.missed_count),
      head_correct_count: sum(days, d => d.head_correct_count),
      target_correct_count: sum(days, d => d.target_correct_count),
      source_correct_count: sum(days, d => d.source_correct_count),
      avg_inclusion_distance: attested > 0 ? weightedDistance / attested : null,
    };
  });
}

export function weeklySync(
  rows: FctSyncCommitteeParticipationByValidatorDaily[]
): FctSyncCommitteeParticipationByValidatorDaily[] {
  return [...groupByValidatorWeek(rows).values()].map(days => ({
    validator_index: days[0].validator_index,
    day_start_date: weekStartOf(days[0].day_start_date ?? ''),
    total_slots: sum(days, d => d.total_slots),
    participated_count: sum(days, d => d.participated_count),
    missed_count: sum(days, d => d.missed_count),
  }));
}

export function weeklyBalance(rows: FctValidatorBalanceDaily[]): FctValidatorBalanceDaily[] {
  return [...groupByValidatorWeek(rows).values()].map(unsorted => {
    const days = [...unsorted].sort((a, b) => (a.day_start_date ?? '').localeCompare(b.day_start_date ?? ''));
    const first = days[0];
    const last = days[days.length - 1];
    const known = (values: (number | null | undefined)[]): number[] =>
      values.filter((v): v is number => v !== null && v !== undefined);
    const mins = known(days.map(d => d.min_balance));
    const maxes = known(days.map(d => d.max_balance));
    return {
      validator_index: first.validator_index,
      day_start_date: weekStartOf(first.day_start_date ?? ''),
      start_epoch: first.start_epoch,
      end_epoch: last.end_epoch,
      start_balance: first.start_balance,
      end_balance: last.end_balance,
      min_balance: mins.length ? Math.min(...mins) : null,
      max_balance: maxes.length ? Math.max(...maxes) : null,
      effective_balance: last.effective_balance,
      status: last.status,
      slashed: days.some(d => d.slashed),
    };
  });
}
