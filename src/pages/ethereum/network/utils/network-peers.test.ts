import { describe, expect, it } from 'vitest';
import type { FctPeerCountByClClientCityDaily } from '@/api/types.gen';
import { calendarDays, cityCounts, peerDays, versionSpans, type PeerDay } from './network-peers';

const day = (date: string, fields: Partial<PeerDay> = {}): PeerDay => ({
  day_start_date: date,
  seen_by_sentry: true,
  seen_by_enr: false,
  client: 'lighthouse',
  version: 'v8.0.0',
  ...fields,
});

describe('peerDays', () => {
  it('sorts the days, drops rows neither source saw, and keeps the row with more status responses', () => {
    const days = peerDays([
      day('2026-04-03'),
      day('2026-04-01', { status_count: 2, version: 'v8.0.0' }),
      day('2026-04-01', { status_count: 9, version: 'v8.0.1' }),
      day('2026-04-01', { status_count: 4, version: 'v8.0.2' }),
      day('2026-04-02', { seen_by_sentry: false, seen_by_enr: false }),
    ]);
    expect(days.map(row => [row.day_start_date, row.version])).toEqual([
      ['2026-04-01', 'v8.0.1'],
      ['2026-04-03', 'v8.0.0'],
    ]);
  });
});

describe('calendarDays', () => {
  it('lists every day across a month end, both ends included', () => {
    expect(calendarDays('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });
});

describe('versionSpans', () => {
  it('starts a new span each time the version changes, even back to an earlier one, newest first', () => {
    const spans = versionSpans([
      day('2026-04-01', { version: 'v8.0.0' }),
      day('2026-04-02', { version: 'v8.0.0' }),
      day('2026-04-03', { version: 'v8.1.0' }),
      day('2026-04-04', { version: 'v8.0.0' }),
      day('2026-04-05', { client: 'nimbus', version: '', agent_version: 'v25.1.0' }),
    ]);
    expect(spans).toEqual([
      { client: 'nimbus', version: 'v25.1.0', first: '2026-04-05', last: '2026-04-05', days: 1 },
      { client: 'lighthouse', version: 'v8.0.0', first: '2026-04-04', last: '2026-04-04', days: 1 },
      { client: 'lighthouse', version: 'v8.1.0', first: '2026-04-03', last: '2026-04-03', days: 1 },
      { client: 'lighthouse', version: 'v8.0.0', first: '2026-04-01', last: '2026-04-02', days: 2 },
    ]);
  });
});

describe('cityCounts', () => {
  const cell = (city: string, networkType: string, client: string, peers: number): FctPeerCountByClClientCityDaily => ({
    day_start_date: '2026-04-01',
    country_code: 'DE',
    city,
    network_type: networkType,
    client,
    peer_count: peers,
  });

  it('sums clients per city, splits hosting from other networks, and puts rollups last however large', () => {
    expect(
      cityCounts([
        cell('Berlin', 'other', 'prysm', 6),
        cell('Falkenstein', 'hosting', 'lighthouse', 4),
        cell('Berlin', 'hosting', 'lighthouse', 2),
        cell('other', 'other', 'teku', 40),
        cell('unknown', 'hosting', 'teku', 9),
        cell('Falkenstein', 'hosting', 'prysm', 5),
        cell('Hamburg', 'other', 'nimbus', 0),
      ])
    ).toEqual([
      { city: 'Falkenstein', hosting: 9, other: 0, total: 9 },
      { city: 'Berlin', hosting: 2, other: 6, total: 8 },
      { city: 'other', hosting: 0, other: 40, total: 40 },
      { city: 'unknown', hosting: 9, other: 0, total: 9 },
    ]);
  });
});
