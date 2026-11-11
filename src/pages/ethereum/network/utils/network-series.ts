import type { SeriesData } from '@/components/Charts/MultiLine';
import type { FctPeerConcentrationElDaily, FctPeerCountByCountryDaily } from '@/api/types.gen';
import { CONSENSUS_CLIENTS, getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { OTHER_VERSION_COLOR } from '@/pages/ethereum/clients/utils/client-versions';
import type { PlaceCensusRow } from '@/pages/ethereum/network/hooks/usePlaceCensus';
import { layerCounts, sumBy } from './network-census';

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

/** Where a layer's nodes run on a day; the consensus and execution concentration tables share a shape */
export type ConcentrationRow = FctPeerConcentrationElDaily;

/** A country's nodes on a day */
export type CountryDayRow = Pick<FctPeerCountByCountryDaily, 'day_start_date' | 'country_code' | 'peer_count'>;

/** Continents in the order their bands stack, with the concentration column that counts each */
export const CONTINENTS = [
  { key: 'europe_peer_count', label: 'Europe' },
  { key: 'north_america_peer_count', label: 'North America' },
  { key: 'asia_peer_count', label: 'Asia' },
  { key: 'oceania_peer_count', label: 'Oceania' },
  { key: 'south_america_peer_count', label: 'South America' },
  { key: 'africa_peer_count', label: 'Africa' },
  { key: 'antarctica_peer_count', label: 'Antarctica' },
] as const;

/** Nodes geolocated to a continent on a day, the whole that continent and country shares are of */
export function geolocated(row: ConcentrationRow): number {
  return CONTINENTS.reduce((sum, { key }) => sum + (row[key] ?? 0), 0);
}

/** Codes of the `limit` countries with the most nodes in the rows, largest first; unlocated nodes are no country */
export function topCountries(rows: CountryDayRow[], limit: number): string[] {
  const totals = new Map<string, number>();
  for (const { country_code: code, peer_count: count } of rows) {
    if (code && /^[A-Z]{2}$/.test(code)) totals.set(code, (totals.get(code) ?? 0) + (count ?? 0));
  }
  return [...totals]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code]) => code);
}

/** Each country's nodes as a percentage of each day's geolocated nodes, null on days without a whole */
export function countryShares(
  rows: CountryDayRow[],
  wholes: ConcentrationRow[],
  days: string[],
  code: string
): Array<number | null> {
  const parts = daySums(
    rows.filter(row => row.country_code === code),
    row => row.peer_count
  );
  const whole = daySums(wholes, geolocated);
  return days.map(day => {
    const of = whole.get(day) ?? 0;
    return of > 0 ? ((parts.get(day) ?? 0) / of) * 100 : null;
  });
}

const peers = (row: PlaceCensusRow): number | undefined => row.peer_count;

/** A place's peers each day, stacked by client in client colours; other agents stack on top as Other */
export function clientSeries(rows: PlaceCensusRow[]): { days: string[]; series: SeriesData[] } {
  const days = [...new Set(rows.map(row => row.day_start_date ?? '').filter(Boolean))].sort();
  const totals = layerCounts(rows, 'consensus', peers);
  const clients = new Set(totals.clients.map(row => row.client));
  const key = (row: PlaceCensusRow): string =>
    `${row.day_start_date}|${row.client && clients.has(row.client) ? row.client : row.client && row.client !== 'unknown' ? 'other' : 'unknown'}`;
  const byDayClient = sumBy(rows, key, peers);
  const series: SeriesData[] = [...totals.clients.map(row => row.client), ...(totals.other > 0 ? ['other'] : [])].map(
    client => ({
      name: client === 'other' ? 'Other' : formatClientName(client),
      data: days.map(day => byDayClient.get(`${day}|${client}`) ?? 0),
      color: client === 'other' ? OTHER_VERSION_COLOR : getClientColor(client),
      stack: 'peers',
      showArea: true,
      areaOpacity: client === 'other' ? 0.3 : 0.85,
      lineWidth: 0,
      showSymbol: false,
    })
  );
  return { days, series };
}
