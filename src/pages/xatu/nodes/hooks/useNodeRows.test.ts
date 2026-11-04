import { describe, expect, it, vi } from 'vitest';
import type { FctNodeLastSeen } from '@/api/types.gen';
import { buildNodeRows } from './useNodeRows';
import type { HistoryRow } from './useNodeHistory';

// The hooks pull in the generated API client, which buildNodeRows doesn't need
vi.mock('./useLastSeenNodes', () => ({}));
vi.mock('./useNodeHistory', () => ({}));

const DAY = 86400;
const NOW = 30 * DAY;

function rollup(nodeId: string, start: number, client: string, username: string, p50: number): HistoryRow {
  return { start, nodeId, username, client, count: 7200, p10: null, p50, p90: null, p95: null };
}

/** What fct_node_last_seen returns for a range starting at `start` */
function lastSeenSince(rows: FctNodeLastSeen[], start: number): FctNodeLastSeen[] {
  return rows.filter(row => (row.last_seen_date_time ?? 0) >= start);
}

describe('buildNodeRows', () => {
  const lastSeen: FctNodeLastSeen[] = [
    {
      node_id: 'active',
      meta_client_name: 'pub-active',
      username: 'from-last-seen',
      meta_consensus_implementation: 'teku',
      meta_client_geo_country: 'Finland',
      last_seen_date_time: NOW - 60,
    },
    {
      node_id: 'earlier',
      meta_client_name: 'pub-earlier',
      username: 'earlier-owner',
      meta_consensus_implementation: 'prysm',
      meta_client_geo_country: 'Japan',
      meta_client_geo_autonomous_system_number: 2516,
      last_seen_date_time: NOW - 3 * DAY,
    },
    // The same Xatu node under its old client name, before it changed its privacy setting
    {
      node_id: 'earlier',
      meta_client_name: 'corp-earlier',
      username: 'earlier-owner',
      meta_client_geo_country: 'Peru',
      last_seen_date_time: NOW - 5 * DAY,
    },
    { node_id: 'quiet', username: 'quiet-owner', last_seen_date_time: NOW - 3600 },
  ];
  const block = [
    rollup('active', 29 * DAY, 'teku', 'from-rollup', 1500),
    rollup('earlier', 20 * DAY, 'lighthouse', 'earlier-owner', 1800),
    rollup('earlier', 27 * DAY, 'prysm', 'earlier-owner', 1700),
  ];
  // Missing from fct_node_last_seen
  const attestation = [rollup('attestation-only', 25 * DAY, 'nimbus', 'att-owner', 2600)];

  const rows = buildNodeRows(lastSeenSince(lastSeen, NOW - 7 * DAY), block, attestation, NOW);
  const byId = new Map(rows.map(row => [row.nodeId, row]));

  it('lists every Xatu node last seen in the range or with rollup rows in it', () => {
    expect([...byId.keys()].sort()).toEqual(['active', 'attestation-only', 'earlier', 'quiet']);
  });

  it('takes identity, location and last seen from fct_node_last_seen', () => {
    expect(byId.get('active')!.node.username).toBe('from-last-seen');
    expect(byId.get('active')!.node.meta_client_geo_country).toBe('Finland');
    expect(byId.get('active')!.online).toBe(true);
  });

  it('gives a Xatu node seen 3 days ago its country, ASN and last seen under 7d', () => {
    const earlier = byId.get('earlier')!;
    expect(earlier.node.meta_consensus_implementation).toBe('prysm');
    expect(earlier.node.meta_client_geo_country).toBe('Japan');
    expect(earlier.node.meta_client_geo_autonomous_system_number).toBe(2516);
    expect(earlier.node.last_seen_date_time).toBe(NOW - 3 * DAY);
    expect(earlier.online).toBe(false);
    expect(earlier.observation?.blockP50).toBe(1700);
  });

  it('leaves out a Xatu node seen 3 days ago under 24h', () => {
    const lastDay = buildNodeRows(lastSeenSince(lastSeen, NOW - DAY), [], [], NOW);
    expect(lastDay.map(row => row.nodeId).sort()).toEqual(['active', 'quiet']);
  });

  it('lists a Xatu node missing from fct_node_last_seen with its latest rollup client, without location', () => {
    const attestationOnly = byId.get('attestation-only')!;
    expect(attestationOnly.node.username).toBe('att-owner');
    expect(attestationOnly.node.meta_consensus_implementation).toBe('nimbus');
    expect(attestationOnly.node.meta_client_geo_country).toBeUndefined();
    expect(attestationOnly.node.last_seen_date_time).toBeUndefined();
    expect(attestationOnly.online).toBe(false);
  });

  it('keeps a Xatu node with no rollup rows, without timings', () => {
    expect(byId.get('quiet')!.observation).toBeNull();
  });

  it('lists Xatu nodes most recently seen first', () => {
    expect(rows.map(row => row.nodeId)).toEqual(['active', 'quiet', 'earlier', 'attestation-only']);
  });
});
