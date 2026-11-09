import type { FctPeerCountByClClientCityDaily, IntPeerDailyOrderByPeerId } from '@/api/types.gen';

/** A peer's row on one day */
export type PeerDay = IntPeerDailyOrderByPeerId;

/** Cities the census folds small or unlocated cells into, which name no single city */
export const ROLLUP_CITIES: ReadonlySet<string> = new Set(['other', 'unknown', '']);

/**
 * Whether a peer runs on a hosting provider's network. Only hosting peers may be shown with a city or network; other
 * peers are placed no finer than their country.
 */
export function isHosting(row: { network_type?: string }): boolean {
  return row.network_type === 'hosting';
}

/**
 * A peer ID shortened the way libp2p logs it, e.g. "16*Bm3xQs": every secp256k1 peer ID starts "16Uiu2HA", so only
 * the tail tells peers apart.
 */
export function shortPeerId(peerId: string): string {
  return peerId.length > 14 ? `${peerId.slice(0, 2)}*${peerId.slice(-6)}` : peerId;
}

/**
 * The days a peer was counted, oldest first: rows a recount dropped (seen by neither source) are left out. When a
 * day holds more than one row (the same peer ID under two keys), the row with more status responses wins.
 */
export function peerDays(rows: PeerDay[]): PeerDay[] {
  const byDay = new Map<string, PeerDay>();
  for (const row of rows) {
    if (!row.day_start_date || !(row.seen_by_sentry || row.seen_by_enr)) continue;
    const held = byDay.get(row.day_start_date);
    if (!held || (row.status_count ?? 0) > (held.status_count ?? 0)) byDay.set(row.day_start_date, row);
  }
  return [...byDay.values()].sort((a, b) => (a.day_start_date ?? '').localeCompare(b.day_start_date ?? ''));
}

/** Every calendar day from `first` to `last`, inclusive */
export function calendarDays(first: string, last: string): string[] {
  const days: string[] = [];
  for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86400000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/** A run of days a peer reported one client version */
export interface VersionSpan {
  client: string;
  version: string;
  first: string;
  last: string;
  days: number;
}

/** The client versions a peer ran, newest first, one span per unbroken run of the same version */
export function versionSpans(days: PeerDay[]): VersionSpan[] {
  const spans: VersionSpan[] = [];
  for (const row of days) {
    const client = row.client ?? '';
    const version = row.version || row.agent_version || '';
    const span = spans[spans.length - 1];
    if (span && span.client === client && span.version === version) {
      span.last = row.day_start_date ?? span.last;
      span.days += 1;
    } else {
      spans.push({ client, version, first: row.day_start_date ?? '', last: row.day_start_date ?? '', days: 1 });
    }
  }
  return spans.reverse();
}

/** One city's consensus peers on a day, split by network type */
export interface CityCount {
  city: string;
  hosting: number;
  other: number;
  total: number;
}

/**
 * A country's cities on one day by peers, largest first, with the folded and unlocated cells last. Hosting and other
 * networks are counted apart, since only hosting peers are listed by city.
 */
export function cityCounts(rows: FctPeerCountByClClientCityDaily[]): CityCount[] {
  const byCity = new Map<string, CityCount>();
  for (const row of rows) {
    const city = row.city ?? '';
    const entry = byCity.get(city) ?? { city, hosting: 0, other: 0, total: 0 };
    const count = row.peer_count ?? 0;
    if (row.network_type === 'hosting') entry.hosting += count;
    else entry.other += count;
    entry.total += count;
    byCity.set(city, entry);
  }
  return [...byCity.values()]
    .filter(entry => entry.total > 0)
    .sort((a, b) => Number(ROLLUP_CITIES.has(a.city)) - Number(ROLLUP_CITIES.has(b.city)) || b.total - a.total);
}
