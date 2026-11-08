import type { SeriesData } from '@/components/Charts/MultiLine';
import { CONSENSUS_CLIENTS, getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';

type DayRow = { day_start_date?: string };

/** The days the rows hold, oldest first, keeping only days where `count` sums above zero when given */
export function seriesDays<T extends DayRow>(rows: T[], count?: (row: T) => number | undefined): string[] {
  const sums = count ? daySums(rows, count) : null;
  const days = new Set<string>();
  for (const row of rows) {
    const day = row.day_start_date;
    if (day && (!sums || (sums.get(day) ?? 0) > 0)) days.add(day);
  }
  return [...days].sort();
}

/** `count` summed over each day's rows */
export function daySums<T extends DayRow>(rows: T[], count: (row: T) => number | undefined): Map<string, number> {
  const sums = new Map<string, number>();
  for (const row of rows) {
    if (!row.day_start_date) continue;
    sums.set(row.day_start_date, (sums.get(row.day_start_date) ?? 0) + (count(row) ?? 0));
  }
  return sums;
}

/** Each day's `part` as a percentage of its `whole`, null on days with no whole */
export function dayShares<T extends DayRow>(
  rows: T[],
  days: string[],
  part: (row: T) => number | undefined,
  whole: (row: T) => number | undefined
): Array<number | null> {
  const parts = daySums(rows, part);
  const wholes = daySums(rows, whole);
  return days.map(day => {
    const of = wholes.get(day) ?? 0;
    return of > 0 ? ((parts.get(day) ?? 0) / of) * 100 : null;
  });
}

/** An area that stacks with the other layers of `stack` into one band per day */
export function stackLayer(name: string, data: Array<number | null>, color: string, stack: string): SeriesData {
  return { name, data, color, stack, showArea: true, areaOpacity: 0.85, lineWidth: 0, showSymbol: false };
}

/** A plain line */
export function line(name: string, data: Array<number | null>, color: string): SeriesData {
  return { name, data, color, showSymbol: false };
}

/**
 * Each consensus client's `part` as a share of its `whole` per day, largest client first, in client colours. Clients
 * averaging fewer than `minPerDay` of `whole` a day are left out, since a few peers swing their share too far.
 */
export function clientShareLines<T extends DayRow & { client?: string }>(
  rows: T[],
  days: string[],
  part: (row: T) => number | undefined,
  whole: (row: T) => number | undefined,
  minPerDay: number
): SeriesData[] {
  const clients: readonly string[] = CONSENSUS_CLIENTS;
  if (days.length === 0) return [];
  const sizes = new Map<string, number>();
  for (const row of rows) {
    if (row.client && clients.includes(row.client))
      sizes.set(row.client, (sizes.get(row.client) ?? 0) + (whole(row) ?? 0));
  }
  return [...sizes]
    .filter(([, size]) => size / days.length >= minPerDay)
    .sort((a, b) => b[1] - a[1])
    .map(([client]) =>
      line(
        formatClientName(client),
        dayShares(
          rows.filter(row => row.client === client),
          days,
          part,
          whole
        ),
        getClientColor(client)
      )
    );
}
