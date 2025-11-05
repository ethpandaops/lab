import { describe, it, expect } from 'vitest';
import {
  FORK_ORDER,
  FORK_DISPLAY_NAMES,
  getNetworkForks,
  getActiveFork,
  getNextFork,
  isForkActive,
  getForkEpoch,
  getForksAtEpoch,
} from './forks';
import type { Network } from '@/hooks/useConfig';

// Mock network for testing
const mockNetwork: Network = {
  name: 'testnet',
  display_name: 'Test Network',
  chain_id: 12345,
  genesis_time: 1655733600,
  genesis_delay: 0,
  forks: {
    consensus: {
      phase0: { epoch: 0, min_client_versions: {} },
      altair: { epoch: 50, min_client_versions: {} },
      bellatrix: { epoch: 100, min_client_versions: {} },
      capella: { epoch: 200, min_client_versions: {} },
      deneb: { epoch: 300, min_client_versions: {} },
      electra: { epoch: 400, min_client_versions: {} },
    },
  },
};

describe('forks utilities', () => {
  describe('FORK_ORDER', () => {
    it('should have correct order', () => {
      expect(FORK_ORDER).toEqual(['phase0', 'altair', 'bellatrix', 'capella', 'deneb', 'electra', 'fulu', 'glaos']);
    });
  });

  describe('FORK_DISPLAY_NAMES', () => {
    it('should have display name for each fork', () => {
      FORK_ORDER.forEach(fork => {
        expect(FORK_DISPLAY_NAMES[fork]).toBeDefined();
        expect(typeof FORK_DISPLAY_NAMES[fork]).toBe('string');
      });
    });
  });

  describe('getNetworkForks', () => {
    it('should return all configured forks sorted by epoch', () => {
      const forks = getNetworkForks(mockNetwork);
      expect(forks).toHaveLength(6);
      expect(forks[0].name).toBe('phase0');
      expect(forks[0].epoch).toBe(0);
      expect(forks[5].name).toBe('electra');
      expect(forks[5].epoch).toBe(400);
    });

    it('should mark forks as active when currentEpoch is provided', () => {
      const forks = getNetworkForks(mockNetwork, 150);
      expect(forks[0].isActive).toBe(true); // phase0
      expect(forks[1].isActive).toBe(true); // altair
      expect(forks[2].isActive).toBe(true); // bellatrix
      expect(forks[3].isActive).toBe(false); // capella
      expect(forks[4].isActive).toBe(false); // deneb
    });

    it('should handle forks at the same epoch (genesis)', () => {
      const networkWithMultipleAtGenesis: Network = {
        ...mockNetwork,
        forks: {
          consensus: {
            phase0: { epoch: 0, min_client_versions: {} },
            altair: { epoch: 0, min_client_versions: {} },
          },
        },
      };

      const forks = getNetworkForks(networkWithMultipleAtGenesis);
      expect(forks).toHaveLength(2);
      expect(forks.every(f => f.epoch === 0)).toBe(true);
    });
  });

  describe('getActiveFork', () => {
    it('should return the most recent active fork', () => {
      const fork = getActiveFork(mockNetwork, 150);
      expect(fork).not.toBeNull();
      expect(fork?.name).toBe('bellatrix');
      expect(fork?.epoch).toBe(100);
      expect(fork?.isActive).toBe(true);
    });

    it('should return phase0 at genesis', () => {
      const fork = getActiveFork(mockNetwork, 0);
      expect(fork).not.toBeNull();
      expect(fork?.name).toBe('phase0');
      expect(fork?.epoch).toBe(0);
    });

    it('should return the latest fork when epoch is very high', () => {
      const fork = getActiveFork(mockNetwork, 999999);
      expect(fork).not.toBeNull();
      expect(fork?.name).toBe('electra');
      expect(fork?.epoch).toBe(400);
    });

    it('should return null if epoch is before genesis', () => {
      const networkWithNoGenesisFork: Network = {
        ...mockNetwork,
        forks: {
          consensus: {
            altair: { epoch: 50, min_client_versions: {} },
          },
        },
      };

      const fork = getActiveFork(networkWithNoGenesisFork, 0);
      expect(fork).toBeNull();
    });
  });

  describe('getNextFork', () => {
    it('should return the next upcoming fork', () => {
      const fork = getNextFork(mockNetwork, 150);
      expect(fork).not.toBeNull();
      expect(fork?.name).toBe('capella');
      expect(fork?.epoch).toBe(200);
      expect(fork?.isActive).toBe(false);
    });

    it('should return null if no upcoming forks', () => {
      const fork = getNextFork(mockNetwork, 500);
      expect(fork).toBeNull();
    });

    it('should return the earliest upcoming fork when multiple exist', () => {
      const fork = getNextFork(mockNetwork, 0);
      expect(fork).not.toBeNull();
      expect(fork?.name).toBe('altair');
      expect(fork?.epoch).toBe(50);
    });
  });

  describe('isForkActive', () => {
    it('should return true for active forks', () => {
      expect(isForkActive(mockNetwork, 'phase0', 0)).toBe(true);
      expect(isForkActive(mockNetwork, 'altair', 50)).toBe(true);
      expect(isForkActive(mockNetwork, 'altair', 100)).toBe(true);
    });

    it('should return false for inactive forks', () => {
      expect(isForkActive(mockNetwork, 'altair', 49)).toBe(false);
      expect(isForkActive(mockNetwork, 'deneb', 200)).toBe(false);
    });

    it('should return false if fork not configured', () => {
      expect(isForkActive(mockNetwork, 'fulu', 1000)).toBe(false);
    });

    it('should return false if epoch not provided', () => {
      expect(isForkActive(mockNetwork, 'altair')).toBe(false);
    });
  });

  describe('getForkEpoch', () => {
    it('should return the correct epoch for configured forks', () => {
      expect(getForkEpoch(mockNetwork, 'phase0')).toBe(0);
      expect(getForkEpoch(mockNetwork, 'altair')).toBe(50);
      expect(getForkEpoch(mockNetwork, 'deneb')).toBe(300);
    });

    it('should return null for unconfigured forks', () => {
      expect(getForkEpoch(mockNetwork, 'fulu')).toBeNull();
      expect(getForkEpoch(mockNetwork, 'glaos')).toBeNull();
    });
  });

  describe('getForksAtEpoch', () => {
    it('should return forks that activate at a specific epoch', () => {
      const forks = getForksAtEpoch(mockNetwork, 100);
      expect(forks).toHaveLength(1);
      expect(forks[0].name).toBe('bellatrix');
    });

    it('should handle multiple forks at the same epoch', () => {
      const networkWithMultipleForks: Network = {
        ...mockNetwork,
        forks: {
          consensus: {
            phase0: { epoch: 0, min_client_versions: {} },
            altair: { epoch: 0, min_client_versions: {} },
            bellatrix: { epoch: 100, min_client_versions: {} },
          },
        },
      };

      const forks = getForksAtEpoch(networkWithMultipleForks, 0);
      expect(forks).toHaveLength(2);
      expect(forks.map(f => f.name)).toContain('phase0');
      expect(forks.map(f => f.name)).toContain('altair');
    });

    it('should return empty array if no forks at epoch', () => {
      const forks = getForksAtEpoch(mockNetwork, 99);
      expect(forks).toHaveLength(0);
    });
  });
});
