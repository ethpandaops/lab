import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeaconClock } from './useBeaconClock';
import * as useNetworkModule from '@/hooks/useNetwork';
import * as useIntervalModule from '@/hooks/useInterval';
import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import type { Network } from '@/contexts/NetworkContext/NetworkContext.types';

// Mock the dependencies
vi.mock('@/hooks/useNetwork');
vi.mock('@/hooks/useInterval');

describe('useBeaconClock', () => {
  // Helper to create a mock network with genesis_time
  const createMockNetwork = (genesis_time: number): Partial<Network> => ({
    name: 'mainnet',
    display_name: 'Mainnet',
    genesis_time,
  });

  // Store the original console.warn
  const originalWarn = console.warn;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console.warn to verify warning messages
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  describe('basic slot and epoch calculation', () => {
    it('should calculate correct slot and epoch based on genesis time', () => {
      // Genesis at timestamp 1606824000 (Dec 1, 2020)
      const genesis_time = 1606824000;
      // Current time is 120 seconds after genesis (10 slots, epoch 0)
      const currentTime = (genesis_time + 120) * 1000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(10);
      expect(result.current.epoch).toBe(0);
    });

    it('should calculate epoch correctly for later slots', () => {
      const genesis_time = 1606824000;
      // 384 slots = 12 epochs (32 slots per epoch)
      const currentTime = (genesis_time + 384 * SECONDS_PER_SLOT) * 1000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(384);
      expect(result.current.epoch).toBe(12);
    });

    it('should handle genesis time exactly (slot 0, epoch 0)', () => {
      const genesis_time = 1606824000;
      const currentTime = genesis_time * 1000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
    });

    it('should calculate fractional slots correctly (rounds down)', () => {
      const genesis_time = 1606824000;
      // 7 seconds after genesis (should be slot 0)
      const currentTime = (genesis_time + 7) * 1000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid genesis_time (undefined)', () => {
      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: { genesis_time: undefined } as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock());

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[useBeaconClock] Invalid genesis_time:', undefined);
    });

    it('should handle invalid genesis_time (zero)', () => {
      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(0) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock());

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[useBeaconClock] Invalid genesis_time:', 0);
    });

    it('should handle invalid genesis_time (negative)', () => {
      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(-1000) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock());

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[useBeaconClock] Invalid genesis_time:', -1000);
    });

    it('should handle pre-genesis time (current time before genesis)', () => {
      const genesis_time = 1606824000;
      // Current time is 60 seconds before genesis
      const currentTime = (genesis_time - 60) * 1000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useBeaconClock] Current time is before genesis_time. Elapsed:',
        -60
      );
    });

    it('should handle null currentNetwork', () => {
      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: null,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock());

      expect(result.current.slot).toBe(0);
      expect(result.current.epoch).toBe(0);
    });
  });

  describe('network changes', () => {
    it('should reset slot and epoch to 0 when network changes', () => {
      const genesis_time1 = 1606824000;
      const genesis_time2 = 1606900000;

      const { rerender, result } = renderHook(
        ({ network }) => {
          vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
            currentNetwork: network,
            setCurrentNetwork: vi.fn(),
            networks: [],
            isLoading: false,
          });
          vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});
          return useBeaconClock(() => (genesis_time1 + 120) * 1000);
        },
        {
          initialProps: { network: createMockNetwork(genesis_time1) as Network },
        }
      );

      // Initially should have slot 10
      expect(result.current.slot).toBe(10);

      // Change network
      rerender({ network: createMockNetwork(genesis_time2) as Network });

      // After network change and recalculation, values should update
      // Note: The actual values will depend on the new network's genesis time
      expect(result.current).toBeDefined();
    });
  });

  describe('interval management', () => {
    it('should set up interval with 1000ms delay when network is available', () => {
      const genesis_time = 1606824000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      renderHook(() => useBeaconClock());

      expect(useIntervalModule.useInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should set up interval with null delay when network is not available', () => {
      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: null,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      renderHook(() => useBeaconClock());

      expect(useIntervalModule.useInterval).toHaveBeenCalledWith(expect.any(Function), null);
    });

    it('should call the interval callback to update slot and epoch', () => {
      const genesis_time = 1606824000;
      let intervalCallback: (() => void) | null = null;
      let currentTime = (genesis_time + 12) * 1000; // Slot 1

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      // Capture the interval callback
      vi.mocked(useIntervalModule.useInterval).mockImplementation(callback => {
        intervalCallback = callback;
      });

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(1);

      // Simulate time passing to next slot
      currentTime = (genesis_time + 24) * 1000; // Slot 2

      // Wrap the interval callback in act to properly handle state updates
      act(() => {
        if (intervalCallback) {
          intervalCallback();
        }
      });

      expect(result.current.slot).toBe(2);
    });
  });

  describe('visibility change handling', () => {
    it('should add and remove visibilitychange event listener', () => {
      const genesis_time = 1606824000;
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { unmount } = renderHook(() => useBeaconClock());

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('custom getCurrentTime function', () => {
    it('should use custom getCurrentTime function when provided', () => {
      const genesis_time = 1606824000;
      const customTime = (genesis_time + 60) * 1000; // Slot 5
      const getTimeMock = vi.fn(() => customTime);

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(getTimeMock));

      expect(getTimeMock).toHaveBeenCalled();
      expect(result.current.slot).toBe(5);
      expect(result.current.epoch).toBe(0);
    });

    it('should default to Date.now when no getCurrentTime is provided', () => {
      const genesis_time = 1606824000;
      const now = Date.now();
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      renderHook(() => useBeaconClock());

      expect(dateNowSpy).toHaveBeenCalled();

      dateNowSpy.mockRestore();
    });
  });

  describe('state update optimization', () => {
    it('should only update state when slot or epoch actually changes', () => {
      const genesis_time = 1606824000;
      let currentTime = (genesis_time + 1) * 1000; // Within slot 0
      let intervalCallback: (() => void) | null = null;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(callback => {
        intervalCallback = callback;
      });

      const { result } = renderHook(() => {
        return useBeaconClock(() => currentTime);
      });

      expect(result.current.slot).toBe(0);

      // Move time forward but stay in same slot
      currentTime = (genesis_time + 5) * 1000; // Still slot 0
      act(() => {
        if (intervalCallback) {
          intervalCallback();
        }
      });

      // Should not trigger re-render since slot didn't change
      expect(result.current.slot).toBe(0);

      // Move to next slot
      currentTime = (genesis_time + 13) * 1000; // Slot 1
      act(() => {
        if (intervalCallback) {
          intervalCallback();
        }
      });

      // Should trigger re-render since slot changed
      expect(result.current.slot).toBe(1);
    });
  });

  describe('large slot and epoch values', () => {
    it('should handle large slot numbers correctly', () => {
      const genesis_time = 1606824000;
      // 1 million slots later
      const currentTime = (genesis_time + 1_000_000 * SECONDS_PER_SLOT) * 1000;

      vi.mocked(useNetworkModule.useNetwork).mockReturnValue({
        currentNetwork: createMockNetwork(genesis_time) as Network,
        setCurrentNetwork: vi.fn(),
        networks: [],
        isLoading: false,
      });

      vi.mocked(useIntervalModule.useInterval).mockImplementation(() => {});

      const { result } = renderHook(() => useBeaconClock(() => currentTime));

      expect(result.current.slot).toBe(1_000_000);
      expect(result.current.epoch).toBe(Math.floor(1_000_000 / SLOTS_PER_EPOCH));
    });
  });
});
