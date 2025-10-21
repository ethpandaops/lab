import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetwork } from './useNetwork';
import { NetworkContext } from '@/contexts/NetworkContext';
import type { NetworkContextValue } from '@/contexts/NetworkContext/NetworkContext.types';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import { type ReactNode } from 'react';

describe('useNetwork', () => {
  const mockNetwork: Network = {
    name: 'mainnet',
    display_name: 'Mainnet',
    chain_id: 1,
    genesis_time: 1606824000,
    genesis_delay: 0,
    forks: {
      consensus: {},
    },
  };

  const createWrapper = (
    contextValue: NetworkContextValue | undefined
  ): (({ children }: { children: ReactNode }) => JSX.Element) => {
    const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <NetworkContext.Provider value={contextValue}>{children}</NetworkContext.Provider>
    );
    return Wrapper;
  };

  describe('basic functionality', () => {
    it('should return network context value when used within NetworkProvider', () => {
      const mockContextValue: NetworkContextValue = {
        currentNetwork: mockNetwork,
        setCurrentNetwork: vi.fn(),
        networks: [mockNetwork],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current).toEqual(mockContextValue);
      expect(result.current.currentNetwork).toBe(mockNetwork);
      expect(result.current.networks).toEqual([mockNetwork]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return the setCurrentNetwork function', () => {
      const setCurrentNetwork = vi.fn();
      const mockContextValue: NetworkContextValue = {
        currentNetwork: mockNetwork,
        setCurrentNetwork,
        networks: [mockNetwork],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.setCurrentNetwork).toBe(setCurrentNetwork);
      expect(typeof result.current.setCurrentNetwork).toBe('function');
    });

    it('should return all networks from context', () => {
      const network1: Network = { ...mockNetwork, name: 'mainnet', display_name: 'Mainnet' };
      const network2: Network = { ...mockNetwork, name: 'sepolia', display_name: 'Sepolia' };
      const network3: Network = { ...mockNetwork, name: 'holesky', display_name: 'Holesky' };

      const mockContextValue: NetworkContextValue = {
        currentNetwork: network1,
        setCurrentNetwork: vi.fn(),
        networks: [network1, network2, network3],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.networks).toHaveLength(3);
      expect(result.current.networks).toEqual([network1, network2, network3]);
    });
  });

  describe('error handling', () => {
    it('should throw error when used outside NetworkProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNetwork());
      }).toThrow('useNetwork must be used within a NetworkProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when context is undefined', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNetwork(), {
          wrapper: createWrapper(undefined),
        });
      }).toThrow('useNetwork must be used within a NetworkProvider');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loading states', () => {
    it('should return isLoading: true when loading', () => {
      const mockContextValue: NetworkContextValue = {
        currentNetwork: null,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: true,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentNetwork).toBeNull();
    });

    it('should return isLoading: false when loaded', () => {
      const mockContextValue: NetworkContextValue = {
        currentNetwork: mockNetwork,
        setCurrentNetwork: vi.fn(),
        networks: [mockNetwork],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('null network handling', () => {
    it('should handle null currentNetwork', () => {
      const mockContextValue: NetworkContextValue = {
        currentNetwork: null,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.currentNetwork).toBeNull();
    });

    it('should handle empty networks array', () => {
      const mockContextValue: NetworkContextValue = {
        currentNetwork: null,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.networks).toEqual([]);
      expect(result.current.networks).toHaveLength(0);
    });
  });

  describe('context updates', () => {
    it('should update when currentNetwork changes', () => {
      const network1: Network = { ...mockNetwork, name: 'mainnet', display_name: 'Mainnet' };
      const network2: Network = { ...mockNetwork, name: 'sepolia', display_name: 'Sepolia' };

      let currentContextValue: NetworkContextValue = {
        currentNetwork: network1,
        setCurrentNetwork: vi.fn(),
        networks: [network1, network2],
        isLoading: false,
      };

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <NetworkContext.Provider value={currentContextValue}>{children}</NetworkContext.Provider>
      );

      const { result, rerender } = renderHook(() => useNetwork(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current.currentNetwork?.name).toBe('mainnet');

      // Update context value
      currentContextValue = {
        currentNetwork: network2,
        setCurrentNetwork: vi.fn(),
        networks: [network1, network2],
        isLoading: false,
      };

      rerender();

      expect(result.current.currentNetwork?.name).toBe('sepolia');
    });

    it('should update when networks array changes', () => {
      const network1: Network = { ...mockNetwork, name: 'mainnet' };
      const network2: Network = { ...mockNetwork, name: 'sepolia' };

      let currentContextValue: NetworkContextValue = {
        currentNetwork: network1,
        setCurrentNetwork: vi.fn(),
        networks: [network1],
        isLoading: false,
      };

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <NetworkContext.Provider value={currentContextValue}>{children}</NetworkContext.Provider>
      );

      const { result, rerender } = renderHook(() => useNetwork(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current.networks).toHaveLength(1);

      // Update context value
      currentContextValue = {
        currentNetwork: network1,
        setCurrentNetwork: vi.fn(),
        networks: [network1, network2],
        isLoading: false,
      };

      rerender();

      expect(result.current.networks).toHaveLength(2);
    });

    it('should update when isLoading changes', () => {
      let currentContextValue: NetworkContextValue = {
        currentNetwork: null,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: true,
      };

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <NetworkContext.Provider value={currentContextValue}>{children}</NetworkContext.Provider>
      );

      const { result, rerender } = renderHook(() => useNetwork(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current.isLoading).toBe(true);

      // Update context value
      currentContextValue = {
        currentNetwork: mockNetwork,
        setCurrentNetwork: vi.fn(),
        networks: [mockNetwork],
        isLoading: false,
      };

      rerender();

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('network data structure', () => {
    it('should provide complete network object with all properties', () => {
      const completeNetwork: Network = {
        name: 'mainnet',
        display_name: 'Ethereum Mainnet',
        chain_id: 1,
        genesis_time: 1606824000,
        genesis_delay: 604800,
        forks: {
          consensus: {
            electra: {
              epoch: 12345,
              min_client_versions: {
                lighthouse: '5.0.0',
                prysm: '5.0.0',
              },
            },
          },
        },
      };

      const mockContextValue: NetworkContextValue = {
        currentNetwork: completeNetwork,
        setCurrentNetwork: vi.fn(),
        networks: [completeNetwork],
        isLoading: false,
      };

      const { result } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.currentNetwork).toEqual(completeNetwork);
      expect(result.current.currentNetwork?.name).toBe('mainnet');
      expect(result.current.currentNetwork?.display_name).toBe('Ethereum Mainnet');
      expect(result.current.currentNetwork?.chain_id).toBe(1);
      expect(result.current.currentNetwork?.genesis_time).toBe(1606824000);
      expect(result.current.currentNetwork?.genesis_delay).toBe(604800);
      expect(result.current.currentNetwork?.forks.consensus.electra).toBeDefined();
    });
  });

  describe('reference stability', () => {
    it('should maintain reference when context value does not change', () => {
      const mockContextValue: NetworkContextValue = {
        currentNetwork: mockNetwork,
        setCurrentNetwork: vi.fn(),
        networks: [mockNetwork],
        isLoading: false,
      };

      const { result, rerender } = renderHook(() => useNetwork(), {
        wrapper: createWrapper(mockContextValue),
      });

      const firstResult = result.current;

      // Rerender without changing context
      rerender();

      expect(result.current).toBe(firstResult);
    });
  });
});
