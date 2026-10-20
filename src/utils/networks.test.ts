import { describe, it, expect } from 'vitest';
import { getNetworkFullLabel, getNetworkShortLabel, groupNetworks, parseNetworkName } from './networks';
import type { Network } from '@/hooks/useConfig';

function network(name: string, genesisTime = 0, displayName = name.charAt(0).toUpperCase() + name.slice(1)): Network {
  return {
    name,
    display_name: displayName,
    chain_id: 1,
    genesis_time: genesisTime,
    genesis_delay: 0,
    forks: { consensus: {} },
  };
}

describe('networks utilities', () => {
  describe('parseNetworkName', () => {
    it('should split devnet names into family and label', () => {
      expect(parseNetworkName('glamsterdam-devnet-8')).toEqual({ family: 'Glamsterdam', label: 'Devnet 8' });
    });

    it('should handle multi-word families and shadowforks', () => {
      expect(parseNetworkName('fusaka-mainnet-shadowfork-0')).toEqual({
        family: 'Fusaka Mainnet',
        label: 'Shadowfork 0',
      });
    });

    it('should return null for persistent and unrecognised names', () => {
      expect(parseNetworkName('mainnet')).toBeNull();
      expect(parseNetworkName('hoodi')).toBeNull();
      expect(parseNetworkName('devnet-8')).toBeNull();
      expect(parseNetworkName('glamsterdam-devnet-8a')).toBeNull();
    });
  });

  describe('labels', () => {
    it('should shorten devnet labels and keep display names otherwise', () => {
      expect(getNetworkShortLabel(network('glamsterdam-devnet-8'))).toBe('Devnet 8');
      expect(getNetworkShortLabel(network('mainnet'))).toBe('Mainnet');
    });

    it('should build full devnet labels and keep display names otherwise', () => {
      expect(getNetworkFullLabel(network('glamsterdam-devnet-8'))).toBe('Glamsterdam Devnet 8');
      expect(getNetworkFullLabel(network('sepolia'))).toBe('Sepolia');
      expect(getNetworkFullLabel(network('perf-net', 0, 'Perf Net'))).toBe('Perf Net');
    });
  });

  describe('groupNetworks', () => {
    it('should order public networks canonically, then devnet families, then the rest', () => {
      const groups = groupNetworks([
        network('glamsterdam-devnet-7', 100),
        network('perf-net'),
        network('hoodi'),
        network('glamsterdam-devnet-8', 200),
        network('mainnet'),
        network('bal-devnet-2', 50),
        network('sepolia'),
      ]);

      expect(groups.map(group => [group.label, group.networks.map(n => n.name)])).toEqual([
        ['Public', ['mainnet', 'sepolia', 'hoodi']],
        ['Glamsterdam', ['glamsterdam-devnet-8', 'glamsterdam-devnet-7']],
        ['Bal', ['bal-devnet-2']],
        ['Other', ['perf-net']],
      ]);
    });

    it('should order devnets by genesis rather than alphabetically', () => {
      const groups = groupNetworks([network('fusaka-devnet-9', 900), network('fusaka-devnet-10', 1000)]);

      expect(groups[0].networks.map(n => n.name)).toEqual(['fusaka-devnet-10', 'fusaka-devnet-9']);
    });

    it('should omit empty groups', () => {
      expect(groupNetworks([network('mainnet')]).map(group => group.id)).toEqual(['public']);
      expect(groupNetworks([])).toEqual([]);
    });
  });
});
