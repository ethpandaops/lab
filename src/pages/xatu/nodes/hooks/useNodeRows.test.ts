import { describe, expect, it, vi } from 'vitest';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { buildNodeRows } from './useNodeRows';
import type { HistoryRow } from './useNodeHistory';

// The hooks pull in the generated API client, which buildNodeRows doesn't need
vi.mock('./useActiveNodes', () => ({}));
vi.mock('./useNodeHistory', () => ({}));
vi.mock('@/pages/ethereum/clients/hooks/useClientReleases', () => ({}));

const DAY = 86400;
const NOW = 30 * DAY;

function rollup(nodeId: string, start: number, client: string, username: string, p50: number): HistoryRow {
  return {
    start,
    nodeId,
    username,
    client,
    count: 7200,
    p10: null,
    p50,
    p90: null,
    p95: null,
    node: { node_id: nodeId, username, meta_consensus_implementation: client, classification: 'individual' },
  };
}

describe('buildNodeRows', () => {
  const active: FctNodeActiveLast24h = {
    node_id: 'active',
    username: 'from-active-row',
    meta_consensus_implementation: 'teku',
    meta_client_geo_country: 'Finland',
    last_seen_date_time: NOW - 60,
  };

  const rows = buildNodeRows(
    [active, { node_id: 'quiet', username: 'quiet-owner', last_seen_date_time: NOW - 3600 }],
    [
      rollup('active', 29 * DAY, 'teku', 'from-rollup', 1500),
      // Only active earlier in the range; switched client between its two rows
      rollup('earlier', 10 * DAY, 'lighthouse', 'old-owner', 1800),
      rollup('earlier', 3 * DAY, 'prysm', 'old-owner', 1700),
    ],
    [rollup('attestation-only', 5 * DAY, 'nimbus', 'att-owner', 2600)],
    NOW
  );
  const byId = new Map(rows.map(row => [row.nodeId, row]));

  it('lists every node with rollup rows in the range, and every active node', () => {
    expect([...byId.keys()].sort()).toEqual(['active', 'attestation-only', 'earlier', 'quiet']);
  });

  it('prefers the active row for identity', () => {
    expect(byId.get('active')!.node.username).toBe('from-active-row');
    expect(byId.get('active')!.node.meta_client_geo_country).toBe('Finland');
    expect(byId.get('active')!.online).toBe(true);
  });

  it("takes an earlier node's identity from its latest rollup row, without location or last seen", () => {
    const earlier = byId.get('earlier')!;
    expect(earlier.node.meta_consensus_implementation).toBe('lighthouse');
    expect(earlier.node.meta_client_geo_country).toBeUndefined();
    expect(earlier.node.last_seen_date_time).toBeUndefined();
    expect(earlier.online).toBe(false);
    expect(earlier.observation?.blockP50).toBe(1700);
  });

  it('keeps an active node with no rollup rows, without timings', () => {
    expect(byId.get('quiet')!.observation).toBeNull();
  });
});
