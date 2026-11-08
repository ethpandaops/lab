import type { DeltaType } from '@/components/DataDisplay/Stats/Stats.types';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS } from '@/utils/ethereum';
import type { ClientLayer } from '@/pages/ethereum/clients/utils/client-share';

const DAY = 86400;

/** A census row: one day, counted */
type DayRow = { day_start_date?: string };

/** UTC day (YYYY-MM-DD) of a unix time */
export function isoDay(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** Unix time of a UTC day's start */
export function dayStart(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) / 1000;
}

/**
 * First day of a range of `days` days ending on `endDay`, or of all history when `days` is null. The range starts no
 * earlier than the table's first day, nor than `floor` when the data before it is not comparable.
 */
export function rangeStartDay(
  endDay: string,
  days: number | null,
  firstDay: string | undefined,
  floor?: string
): string {
  const candidates = [days === null ? undefined : isoDay(dayStart(endDay) - (days - 1) * DAY), firstDay, floor].filter(
    (day): day is string => !!day
  );
  const start = candidates.reduce((latest, day) => (day > latest ? day : latest), '');
  return start && start < endDay ? start : endDay;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** English name of an ISO country code, or the code when it names no country */
export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** The earliest and latest days the rows hold */
export function dayBounds(rows: DayRow[]): { first: string | null; last: string | null } {
  let first: string | null = null;
  let last: string | null = null;
  for (const { day_start_date: day } of rows) {
    if (!day) continue;
    if (first === null || day < first) first = day;
    if (last === null || day > last) last = day;
  }
  return { first, last };
}

/** Counts summed per key */
export function sumBy<T>(
  rows: T[],
  key: (row: T) => string,
  count: (row: T) => number | undefined
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + (count(row) ?? 0));
  return totals;
}

/** Sum of a count over rows */
export function total<T>(rows: T[], count: (row: T) => number | undefined): number {
  return rows.reduce((sum, row) => sum + (count(row) ?? 0), 0);
}

/** A share as it reads, or a dash when nothing was counted */
export function formatShare(part: number, whole: number): string {
  if (whole <= 0) return '-';
  const share = (part / whole) * 100;
  return share > 0 && share < 0.05 ? '<0.1%' : `${share.toFixed(1)}%`;
}

/** A signed change as it reads, e.g. "+2.1%" or "−0.4 pts" */
function signed(change: number, unit: string): string {
  const rounded = Number(change.toFixed(1));
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(1)}${unit}`;
}

/**
 * Change from one count to another, e.g. "+2.1%"; undefined without a start to compare with. More or fewer peers is
 * neither good nor bad, so the delta is neutral.
 */
export function countDelta(from: number | null, to: number): { value: string; type: DeltaType } | undefined {
  if (from === null || from <= 0) return undefined;
  return { value: signed(((to - from) / from) * 100, '%'), type: 'neutral' };
}

/** Change from one share to another in percentage points, e.g. "−0.4 pts"; undefined without a start */
export function shareDelta(
  from: { part: number; whole: number } | null,
  to: { part: number; whole: number }
): { value: string; type: DeltaType } | undefined {
  if (from === null || from.whole <= 0 || to.whole <= 0) return undefined;
  return { value: signed((to.part / to.whole - from.part / from.whole) * 100, ' pts'), type: 'neutral' };
}

/** One place (country or network) on the range's last day, against its first */
export interface PlaceRow {
  key: string;
  peers: number;
  /** Share of every peer counted that day (0-100) */
  share: number;
  /** Peers on the range's first day, null when the place was not counted then or the range is one day */
  startPeers: number | null;
}

/**
 * Places ranked by peers on the range's last day, with their peers on its first day. Rows whose key is `rollup` (the
 * census's bucket of places too small to list) are left out, though their peers still count toward each share.
 */
export function rankPlaces<T extends DayRow & { peer_count?: number }>(
  endRows: T[],
  startRows: T[] | null,
  key: (row: T) => string,
  rollup: string
): PlaceRow[] {
  const end = sumBy(endRows, key, row => row.peer_count);
  const start = startRows ? sumBy(startRows, key, row => row.peer_count) : null;
  const whole = total(endRows, row => row.peer_count);
  return [...end.entries()]
    .filter(([place, peers]) => place !== rollup && peers > 0)
    .map(([place, peers]) => ({
      key: place,
      peers,
      share: whole > 0 ? (peers / whole) * 100 : 0,
      startPeers: start?.get(place) ?? null,
    }))
    .sort((a, b) => b.peers - a.peers || a.key.localeCompare(b.key));
}

/** A layer's clients by count on one day, with everything else that advertised an agent summed as Other */
export interface LayerCounts {
  /** Clients of the layer, most counted first */
  clients: Array<{ client: string; count: number }>;
  /** Agents that are not the layer's clients: tools, forks and unparsed agents */
  other: number;
  /** Everything that advertised an agent */
  whole: number;
}

/** Counts per client of a layer; rows without an agent ('unknown' or empty) count nowhere */
export function layerCounts<T extends { client?: string }>(
  rows: T[],
  layer: ClientLayer,
  count: (row: T) => number | undefined
): LayerCounts {
  const known: readonly string[] = layer === 'consensus' ? CONSENSUS_CLIENTS : EXECUTION_CLIENTS;
  const byClient = new Map<string, number>();
  let other = 0;
  let whole = 0;
  for (const row of rows) {
    const client = row.client || 'unknown';
    const value = count(row) ?? 0;
    if (client === 'unknown') continue;
    whole += value;
    if (known.includes(client)) byClient.set(client, (byClient.get(client) ?? 0) + value);
    else other += value;
  }
  const clients = [...byClient.entries()]
    .filter(([, value]) => value > 0)
    .map(([client, value]) => ({ client, count: value }))
    .sort((a, b) => b.count - a.count || a.client.localeCompare(b.client));
  return { clients, other, whole };
}

/**
 * Execution ENR rows of nodes on the network's chain: those advertising the day's dominant fork ID hash. Nodes on
 * a stale fork, or on another chain sharing the network ID, advertise a different hash.
 */
export function onChainRows<T extends DayRow & { fork_id_hash?: string; node_count?: number }>(rows: T[]): T[] {
  const byDay = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const day = row.day_start_date ?? '';
    const hashes = byDay.get(day) ?? new Map<string, number>();
    hashes.set(row.fork_id_hash ?? '', (hashes.get(row.fork_id_hash ?? '') ?? 0) + (row.node_count ?? 0));
    byDay.set(day, hashes);
  }
  const dominant = new Map(
    [...byDay.entries()].map(([day, hashes]) => [day, [...hashes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]])
  );
  return rows.filter(row => !!row.fork_id_hash && row.fork_id_hash === dominant.get(row.day_start_date ?? ''));
}
