import { describe, it, expect } from 'vitest';
import type { PartialRecord, PathRecord, PeerRecord } from '../IndexPage.types';
import {
  buildAdoptionSeries,
  buildCellSourceSeries,
  buildPathLatencySeries,
  buildPathShareSeries,
  buildUsefulCellSeries,
  buildVerdictSeries,
  bucketKeys,
  compareVersionsDesc,
  formatSeconds,
  formatShare,
  latestAdoption,
  normalisePath,
  peerClient,
  pickSentryClient,
  sentryClientsOf,
  summariseCompletions,
  summariseVersions,
  toPathRecords,
  toPeerRecords,
} from './partial-columns';

const H1 = '1792465200';
const H2 = '1792468800';

function path(overrides: Partial<PathRecord>): PathRecord {
  return {
    key: H1,
    sentryClient: 'lighthouse',
    path: 'FULL_GOSSIP',
    nodes: 1,
    completions: 0,
    cellsTotal: 0,
    cellsFromGossip: 0,
    cellsFromEl: 0,
    avgContributingPeers: 0,
    p50: 0,
    p90: 0,
    p99: 0,
    ...overrides,
  };
}

function partial(overrides: Partial<PartialRecord>): PartialRecord {
  return {
    key: H1,
    sentryClient: 'lighthouse',
    nodes: 1,
    receivedMetadata: 0,
    receivedMessages: 0,
    receivedCellMessages: 0,
    receivedCells: 0,
    receivedHeaders: 0,
    cellSenderPeers: 0,
    sentMetadata: 0,
    sentMessages: 0,
    sentCellMessages: 0,
    sentCells: 0,
    sentHeaders: 0,
    cellsAccept: 0,
    cellsIgnore: 0,
    cellsReject: 0,
    verdictCells: 0,
    newCells: 0,
    headerAccept: 0,
    headerIgnore: 0,
    headerReject: 0,
    headerNodeBlocks: 0,
    p50HeaderSeen: 0,
    p90HeaderSeen: 0,
    ...overrides,
  };
}

function peer(overrides: Partial<PeerRecord>): PeerRecord {
  return {
    key: H1,
    client: 'lighthouse',
    version: '8.3.0',
    connected: 0,
    gossipsubV13: 0,
    subscribed: 0,
    requestsPartial: 0,
    supportsSendingPartial: 0,
    ...overrides,
  };
}

const paths: PathRecord[] = [
  path({ path: 'FULL_GOSSIP', completions: 40, cellsTotal: 200, cellsFromGossip: 200, p50: 1600 }),
  path({ path: 'PARTIAL_GOSSIP', completions: 25, cellsTotal: 125, cellsFromGossip: 120, cellsFromEl: 5, p50: 1700 }),
  path({ path: 'EL', completions: 35, cellsTotal: 175, cellsFromEl: 175, p50: 1500 }),
  path({ key: H2, path: 'FULL_GOSSIP', completions: 10, cellsTotal: 50, cellsFromGossip: 50, p50: 1650 }),
  path({ key: H1, sentryClient: 'prysm', path: 'RECONSTRUCTION', completions: 5, cellsTotal: 25 }),
];

describe('normalisePath', () => {
  it('should keep known paths and map the rest to unknown', () => {
    expect(normalisePath('PARTIAL_GOSSIP')).toBe('PARTIAL_GOSSIP');
    expect(normalisePath('')).toBe('UNKNOWN');
    expect(normalisePath(undefined)).toBe('UNKNOWN');
    expect(normalisePath('SOMETHING')).toBe('UNKNOWN');
  });
});

describe('toPathRecords', () => {
  it('should map API rows and drop rows without completions', () => {
    const records = toPathRecords(
      [
        {
          hour_start_date_time: 1792465200,
          meta_consensus_implementation: 'Lighthouse',
          completed_via: 'EL',
          completion_count: 3,
          cells_total: 9,
          cells_from_el: 9,
          p50_completion_slot_start_diff: 1200,
        },
        { hour_start_date_time: 1792465200, meta_consensus_implementation: 'prysm', completion_count: 0 },
      ],
      false
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ key: H1, sentryClient: 'lighthouse', path: 'EL', cellsFromEl: 9, p50: 1200 });
  });
});

describe('sentry clients', () => {
  it('should list sentry clients busiest first and prefer the requested one, then Lighthouse', () => {
    const clients = sentryClientsOf(paths, [partial({ sentryClient: 'teku' })]);
    expect(clients).toEqual(['lighthouse', 'prysm', 'teku']);
    expect(pickSentryClient(clients, 'prysm')).toBe('prysm');
    expect(pickSentryClient(clients, 'nimbus')).toBe('lighthouse');
    expect(pickSentryClient(['prysm'], undefined)).toBe('prysm');
    expect(pickSentryClient([], undefined)).toBeUndefined();
  });
});

describe('summariseCompletions', () => {
  it('should total completions by path and cells by source', () => {
    const summary = summariseCompletions(paths.filter(r => r.sentryClient === 'lighthouse'));
    expect(summary.completions).toBe(110);
    expect(summary.byPath.PARTIAL_GOSSIP).toBe(25);
    expect(summary.byPath.RECONSTRUCTION).toBe(0);
    expect(summary.cellsFromEl).toBe(180);
    expect(summary.cellsTotal).toBe(550);
  });
});

describe('buildPathShareSeries', () => {
  it('should stack path shares that add up to 100 in each bucket', () => {
    const lighthouse = paths.filter(r => r.sentryClient === 'lighthouse');
    const series = buildPathShareSeries(lighthouse, [H1, H2]);
    expect(series.map(s => s.name)).toEqual(['Full gossip', 'Partial gossip', 'Execution layer']);
    const first = series.reduce((sum, s) => sum + ((s.data[0] as number | null) ?? 0), 0);
    expect(first).toBeCloseTo(100);
    expect(series[0].data[1]).toBe(100);
    expect(series[1].data[1]).toBe(0);
    expect(series.every(s => s.stack === 'share')).toBe(true);
  });

  it('should leave buckets without completions empty', () => {
    const series = buildPathShareSeries(
      paths.filter(r => r.key === H1),
      [H1, H2]
    );
    expect(series[0].data[1]).toBeNull();
  });
});

describe('buildPathLatencySeries', () => {
  it('should plot the median per path and leave missing buckets empty', () => {
    const series = buildPathLatencySeries(
      paths.filter(r => r.sentryClient === 'lighthouse'),
      [H1, H2]
    );
    const full = series.find(s => s.name === 'Full gossip');
    const el = series.find(s => s.name === 'Execution layer');
    expect(full?.data).toEqual([1600, 1650]);
    expect(el?.data).toEqual([1500, null]);
  });
});

describe('buildCellSourceSeries', () => {
  it('should split cells into gossip, the execution layer and the recovered remainder', () => {
    const series = buildCellSourceSeries(
      paths.filter(r => r.key === H1),
      [H1]
    );
    const byName = Object.fromEntries(series.map(s => [s.name, s.data[0]]));
    // 525 cells total: 320 gossip, 180 EL, 25 recovered by the Prysm reconstruction.
    expect(byName['Gossip']).toBeCloseTo((320 / 525) * 100, 1);
    expect(byName['Execution layer']).toBeCloseTo((180 / 525) * 100, 1);
    expect(byName['Recovered']).toBeCloseTo((25 / 525) * 100, 1);
  });

  it('should drop sources that never contribute', () => {
    const series = buildCellSourceSeries([path({ completions: 1, cellsTotal: 4, cellsFromGossip: 4 })], [H1]);
    expect(series.map(s => s.name)).toEqual(['Gossip']);
  });
});

describe('partial message series', () => {
  const partials = [
    partial({ verdictCells: 200, newCells: 50, receivedCells: 210, cellsAccept: 10, cellsIgnore: 30 }),
    partial({ key: H2, verdictCells: 0, newCells: 0, receivedCells: 0, headerIgnore: 4 }),
  ];

  it('should plot the useful cell ratio and received cells on the secondary axis', () => {
    const [received, useful] = buildUsefulCellSeries(partials, [H1, H2]);
    expect(received.yAxisIndex).toBe(1);
    expect(received.data).toEqual([210, null]);
    expect(useful.data).toEqual([25, null]);
  });

  it('should stack only the verdicts that occur', () => {
    const series = buildVerdictSeries(partials, [H1, H2]);
    expect(series.map(s => s.name)).toEqual(['Cells accepted', 'Cells ignored', 'Header ignored']);
    expect(series[2].data).toEqual([0, 4]);
  });
});

describe('peer adoption', () => {
  const peers: PeerRecord[] = [
    peer({ key: H1, client: 'lighthouse', version: '8.3.0', subscribed: 100, requestsPartial: 100 }),
    peer({ key: H1, client: 'lighthouse', version: '8.2.3', subscribed: 300, requestsPartial: 0 }),
    peer({ key: H1, client: 'prysm', version: '7.2.1', subscribed: 50, requestsPartial: 50 }),
    peer({ key: H1, client: 'rust-libp2p', version: '0.48.0', subscribed: 50, requestsPartial: 0 }),
    peer({ key: H2, client: 'lighthouse', version: '8.3.0', subscribed: 200, requestsPartial: 200 }),
    peer({ key: H2, client: 'lighthouse', version: '8.2.3', subscribed: 200, requestsPartial: 0 }),
  ];

  it('should plot consensus clients and all peers, leaving crawlers to the total', () => {
    const series = buildAdoptionSeries(peers, [H1, H2]);
    expect(series.map(s => s.name)).toEqual(['Lighthouse', 'Prysm', 'All peers']);
    expect(series[0].data).toEqual([25, 50]);
    expect(series[1].data).toEqual([100, null]);
    expect(series[2].data).toEqual([30, 50]);
  });

  it('should report the latest complete bucket and fall back to the current one', () => {
    const now = (Number(H2) + 600) * 1000;
    expect(latestAdoption(peers, false, now)).toEqual({ key: H1, subscribed: 500, requestsPartial: 150 });
    expect(
      latestAdoption(
        peers.filter(r => r.key === H2),
        false,
        now
      )?.key
    ).toBe(H2);
    expect(latestAdoption([], false, now)).toBeNull();
  });

  it('should average versions over the buckets, grouped by client and newest first', () => {
    const versions = summariseVersions(peers);
    expect(versions.map(v => `${v.client} ${v.version}`)).toEqual([
      'lighthouse 8.3.0',
      'lighthouse 8.2.3',
      'prysm 7.2.1',
    ]);
    expect(versions[0]).toMatchObject({ subscribed: 150, requestsPartial: 150 });
    expect(versions[2]).toMatchObject({ subscribed: 25, requestsPartial: 25 });
  });

  it('should name Erigon peers by their Caplin consensus layer', () => {
    expect(peerClient('erigon', 'caplin')).toBe('caplin');
    expect(peerClient('Erigon', '3.0.0')).toBe('erigon');
    expect(peerClient('', '')).toBe('unknown');
  });

  it('should read daily averages', () => {
    const records = toPeerRecords(
      [
        {
          day_start_date: '2026-10-20',
          peer_implementation: 'prysm',
          peer_version: '7.3.0',
          avg_subscribed_peer_count: 12.5,
          avg_requests_partial_peer_count: 12.5,
        },
      ],
      true
    );
    expect(records[0]).toMatchObject({ key: '2026-10-20', client: 'prysm', subscribed: 12.5, requestsPartial: 12.5 });
  });
});

describe('compareVersionsDesc', () => {
  it('should sort versions numerically newest first with unparsed versions last', () => {
    const sorted = ['8.2.3', '8.10.0', 'Unknown', '8.3.0', '7.9.9'].sort(compareVersionsDesc);
    expect(sorted).toEqual(['8.10.0', '8.3.0', '8.2.3', '7.9.9', 'Unknown']);
  });
});

describe('formatting', () => {
  it('should format shares and seconds with dashes for missing values', () => {
    expect(formatShare(1, 4)).toBe('25.0%');
    expect(formatShare(1, 0)).toBe('-');
    expect(formatSeconds(1640)).toBe('1.64s');
    expect(formatSeconds(0)).toBe('-');
    expect(formatSeconds(undefined)).toBe('-');
  });

  it('should fill hourly bucket gaps', () => {
    expect(bucketKeys([H2, H1, H2], false)).toEqual([H1, H2]);
    expect(bucketKeys([String(Number(H1) + 7200), H1], false)).toHaveLength(3);
  });
});
