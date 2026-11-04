import { describe, expect, it } from 'vitest';
import type { FctNodeActiveLast24h } from '@/api';
import { processForkReadiness } from './fork-data-processor';

function node(name: string, client: string, version: string): FctNodeActiveLast24h {
  return { meta_client_name: name, meta_consensus_implementation: client, meta_consensus_version: version };
}

describe('processForkReadiness', () => {
  const stats = processForkReadiness(
    {
      allNodes: [
        node('a', 'lighthouse', 'v8.0.0'),
        node('b', 'Lighthouse', 'v7.1.0'),
        node('c', 'teku', 'v25.11.0'),
        node('d', 'caplin', '3.8.1'),
        node('e', 'caplin', '3.8.0'),
        node('f', '', ''),
      ],
      minClientVersions: { lighthouse: '8.0.0', teku: '25.11.0', prysm: '7.0.0' },
    },
    'fulu',
    411392,
    false
  );

  it('judges only nodes whose client has a minimum version', () => {
    expect(stats.totalNodes).toBe(3);
    expect(stats.readyNodes).toBe(2);
    expect(stats.actionNeededCount).toBe(1);
    expect(stats.overallReadyPercentage).toBe(67);
  });

  it('lists clients without a minimum version instead of dropping their nodes', () => {
    expect(stats.noMinimumCount).toBe(3);
    const withoutMinimum = stats.clientReadiness.filter(client => client.minVersion === null);
    expect(withoutMinimum.map(client => [client.clientName, client.totalNodes, client.readyNodes])).toEqual([
      ['caplin', 2, 0],
      ['unknown', 1, 0],
    ]);
  });
});
