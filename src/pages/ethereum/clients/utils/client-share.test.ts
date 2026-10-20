import { describe, it, expect } from 'vitest';
import {
  bucketShares,
  buildShareChartConfig,
  computeCoverage,
  dailyDateValues,
  entityLabel,
  entityQuery,
  filterRecords,
  formatClientName,
  normaliseClient,
  summariseClients,
  summarisePairs,
  toClientCountRecords,
  toEntityOptions,
  type ClientCountRecord,
} from './client-share';

const records: ClientCountRecord[] = [
  { key: '2026-10-17', consensusClient: 'lighthouse', executionClient: 'geth', blocks: 30 },
  { key: '2026-10-17', consensusClient: 'prysm', executionClient: 'nethermind', blocks: 10 },
  { key: '2026-10-17', consensusClient: 'unknown', executionClient: 'unknown', blocks: 60 },
  { key: '2026-10-18', consensusClient: 'lighthouse', executionClient: 'unknown', blocks: 20 },
  { key: '2026-10-18', consensusClient: 'prysm', executionClient: 'geth', blocks: 30 },
];

describe('normaliseClient', () => {
  it('should map empty names to unknown and lowercase the rest', () => {
    expect(normaliseClient(undefined)).toBe('unknown');
    expect(normaliseClient('  ')).toBe('unknown');
    expect(normaliseClient('Lighthouse')).toBe('lighthouse');
  });
});

describe('toClientCountRecords', () => {
  it('should key hourly rows by timestamp and daily rows by date, dropping empty rows', () => {
    expect(
      toClientCountRecords(
        [
          { hour_start_date_time: 1792382400, consensus_client: 'teku', execution_client: 'besu', block_count: 3 },
          { hour_start_date_time: 1792382400, consensus_client: 'teku', execution_client: 'geth', block_count: 0 },
        ],
        false
      )
    ).toEqual([{ key: '1792382400', consensusClient: 'teku', executionClient: 'besu', blocks: 3 }]);
    expect(toClientCountRecords([{ day_start_date: '2026-10-18', block_count: 5 }], true)).toEqual([
      { key: '2026-10-18', consensusClient: 'unknown', executionClient: 'unknown', blocks: 5 },
    ]);
  });
});

describe('summariseClients', () => {
  it('should total blocks per client with unknown last and identified shares', () => {
    const summary = summariseClients(records, 'consensus');
    expect(summary.map(s => s.client)).toEqual(['lighthouse', 'prysm', 'unknown']);
    expect(summary[0]).toMatchObject({ blocks: 50, share: (50 / 150) * 100, identifiedShare: (50 / 90) * 100 });
    expect(summary[2]).toMatchObject({ blocks: 60, share: 40, identifiedShare: null });
  });
});

describe('summarisePairs', () => {
  it('should total blocks per pair, largest first', () => {
    const pairs = summarisePairs(records);
    expect(pairs[0]).toMatchObject({ consensusClient: 'unknown', executionClient: 'unknown', blocks: 60, share: 40 });
    expect(pairs.find(p => p.consensusClient === 'prysm' && p.executionClient === 'geth')?.blocks).toBe(30);
  });
});

describe('computeCoverage', () => {
  it('should count blocks naming each layer and both', () => {
    expect(computeCoverage(records)).toEqual({ total: 150, withConsensus: 90, withExecution: 70, withBoth: 70 });
  });
});

describe('buildShareChartConfig', () => {
  const keys = ['2026-10-17', '2026-10-18', '2026-10-19'];

  it('should stack each client share per bucket including unknown', () => {
    const config = buildShareChartConfig(records, keys, 'consensus', true, false);
    expect(config.labels).toHaveLength(3);
    expect(config.series.map(s => s.name)).toEqual(['Lighthouse', 'Prysm', 'Unknown']);
    expect(config.series[0].data).toEqual([30, 40, null]);
    expect(config.series[2].data).toEqual([60, 0, null]);
    expect(config.series.every(s => s.stack === 'share')).toBe(true);
  });

  it('should leave unknown out and renormalise when identified only', () => {
    const config = buildShareChartConfig(records, keys, 'execution', true, true);
    expect(config.series.map(s => s.name)).toEqual(['Geth', 'Nethermind']);
    expect(config.series[0].data).toEqual([75, 100, null]);
  });
});

describe('bucketShares', () => {
  it('should return the shares for one bucket, unknown last', () => {
    expect(bucketShares(records, '2026-10-17', 'consensus', false)).toEqual({
      total: 100,
      items: [
        { client: 'lighthouse', blocks: 30, share: 30 },
        { client: 'prysm', blocks: 10, share: 10 },
        { client: 'unknown', blocks: 60, share: 60 },
      ],
    });
  });

  it('should drop unknown when identified only', () => {
    expect(bucketShares(records, '2026-10-17', 'consensus', true)).toEqual({
      total: 40,
      items: [
        { client: 'lighthouse', blocks: 30, share: 75 },
        { client: 'prysm', blocks: 10, share: 25 },
      ],
    });
  });
});

describe('formatClientName', () => {
  it('should capitalise client names and label unknown', () => {
    expect(formatClientName('lighthouse')).toBe('Lighthouse');
    expect(formatClientName('unknown')).toBe('Unknown');
    expect(formatClientName('nimbusel')).toBe('Nimbus EL');
    expect(formatClientName('trin-execution')).toBe('Trin Execution');
  });
});

describe('dailyDateValues', () => {
  it('should list the last N UTC days ending today', () => {
    expect(dailyDateValues(3, Date.UTC(2026, 9, 19, 7, 0, 0))).toBe('2026-10-17,2026-10-18,2026-10-19');
  });
});

describe('filterRecords', () => {
  it('returns every record without filters', () => {
    expect(filterRecords(records, {})).toBe(records);
  });

  it('applies both client filters', () => {
    const filtered = filterRecords(records, { consensusClient: 'prysm', executionClient: 'geth' });
    expect(filtered).toEqual([records[4]]);
  });

  it('skips the filter of the excepted layer', () => {
    const filtered = filterRecords(records, { consensusClient: 'prysm', executionClient: 'geth' }, 'consensus');
    expect(filtered.map(r => r.consensusClient)).toEqual(['lighthouse', 'prysm']);
    expect(filterRecords(records, { consensusClient: 'prysm' }, 'consensus')).toBe(records);
  });
});

describe('toEntityOptions', () => {
  it('uses each entity latest day and sorts by validators', () => {
    const options = toEntityOptions([
      { day_start_date: '2026-10-19', entity: 'lido', validator_count: 90 },
      { day_start_date: '2026-10-20', entity: 'lido', validator_count: 100 },
      { day_start_date: '2026-10-19', entity: 'kiln', validator_count: 120 },
      { day_start_date: '2026-10-20', entity: 'coinbase', validator_count: 100 },
      { day_start_date: '2026-10-20', entity: '', validator_count: 500 },
      { day_start_date: '2026-10-20', entity: 'unknown', validator_count: 400 },
    ]);
    expect(options).toEqual([
      { entity: 'kiln', validators: 120 },
      { entity: 'coinbase', validators: 100 },
      { entity: 'lido', validators: 100 },
    ]);
  });
});

describe('entity groups', () => {
  it('adds a group for entities sharing a suffix', () => {
    const options = toEntityOptions([
      { day_start_date: '2026-10-20', entity: 'kiln_lido', validator_count: 50 },
      { day_start_date: '2026-10-20', entity: 'p2porg_lido', validator_count: 40 },
      { day_start_date: '2026-10-20', entity: 'lido', validator_count: 5 },
      { day_start_date: '2026-10-20', entity: 'kiln', validator_count: 60 },
    ]);
    expect(options[0]).toEqual({ entity: '*lido', validators: 95, label: 'Lido (all operators)' });
    expect(options.map(o => o.entity)).toEqual(['*lido', 'kiln', 'kiln_lido', 'p2porg_lido', 'lido']);
  });

  it('builds the API filter and label for a value', () => {
    expect(entityQuery('coinbase')).toEqual({ entity_eq: 'coinbase' });
    expect(entityQuery('*lido')).toEqual({ entity_ends_with: 'lido' });
    expect(entityLabel('coinbase')).toBe('coinbase');
    expect(entityLabel('*lido')).toBe('Lido (all operators)');
  });
});
