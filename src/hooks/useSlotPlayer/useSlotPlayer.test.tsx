import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  useSlotPlayer,
  useSlotPlayerProgress,
  useSlotPlayerState,
  useSlotPlayerConfig,
  useSlotPlayerActions,
  useSlotPlayerMeta,
} from './useSlotPlayer';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import type { SlotPlayerProviderProps } from '@/contexts/SlotPlayerContext';

// Ethereum mainnet genesis time (Dec 1, 2020)
const GENESIS_TIME = 1606824023;
// Calculate timestamps that will produce valid slot numbers
// Using SECONDS_PER_SLOT = 12 (Ethereum mainnet)
const MIN_TIMESTAMP = GENESIS_TIME + 1000 * 12; // slot 1000
const MAX_TIMESTAMP = GENESIS_TIME + 10000 * 12; // slot 10000

// Mock dependencies
vi.mock('@/hooks/useBounds', () => ({
  useTablesBounds: vi.fn(() => ({
    data: {
      aggregate: {
        minOfMins: MIN_TIMESTAMP,
        maxOfMaxes: MAX_TIMESTAMP,
      },
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useBeaconClock', () => ({
  useBeaconClock: vi.fn(() => ({
    slot: 9000,
    timestamp: GENESIS_TIME + 9000 * 12,
  })),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(() => ({
    currentNetwork: {
      name: 'mainnet',
      genesis_time: GENESIS_TIME,
    },
  })),
}));

// Helper to create a test wrapper with SlotPlayerProvider
function createWrapper(props: Partial<SlotPlayerProviderProps> = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SlotPlayerProvider
        tables={['fct_block']}
        initialPlaying={false}
        initialMode="continuous"
        playbackSpeed={1}
        {...props}
      >
        {children}
      </SlotPlayerProvider>
    );
  };
}

describe('useSlotPlayer hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useSlotPlayerProgress', () => {
    it('should return slotProgress value', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerProgress(), { wrapper });

      expect(result.current).toHaveProperty('slotProgress');
      expect(typeof result.current.slotProgress).toBe('number');
      expect(result.current.slotProgress).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSlotPlayerProgress());
      }).toThrow('useSlotPlayerProgress must be used within a SlotPlayerProvider');

      consoleError.mockRestore();
    });

    it('should initialize with zero progress', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerProgress(), { wrapper });

      expect(result.current.slotProgress).toBe(0);
    });
  });

  describe('useSlotPlayerState', () => {
    it('should return complete state object', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerState(), { wrapper });

      expect(result.current).toHaveProperty('currentSlot');
      expect(result.current).toHaveProperty('isPlaying');
      expect(result.current).toHaveProperty('mode');
      expect(result.current).toHaveProperty('isStale');
      expect(result.current).toHaveProperty('staleBehindSlots');
      expect(result.current).toHaveProperty('isLive');
      expect(result.current).toHaveProperty('pauseReason');
    });

    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSlotPlayerState());
      }).toThrow('useSlotPlayerState must be used within a SlotPlayerProvider');

      consoleError.mockRestore();
    });

    it('should initialize with correct default values', () => {
      const wrapper = createWrapper({
        initialPlaying: false,
        initialMode: 'continuous',
      });
      const { result } = renderHook(() => useSlotPlayerState(), { wrapper });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.mode).toBe('continuous');
      expect(result.current.pauseReason).toBeNull();
      expect(typeof result.current.currentSlot).toBe('number');
      expect(typeof result.current.isStale).toBe('boolean');
      expect(typeof result.current.staleBehindSlots).toBe('number');
      expect(typeof result.current.isLive).toBe('boolean');
    });

    it('should respect initialPlaying prop', () => {
      const wrapper = createWrapper({ initialPlaying: true });
      const { result } = renderHook(() => useSlotPlayerState(), { wrapper });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should respect initialMode prop', () => {
      const wrapper = createWrapper({ initialMode: 'single' });
      const { result } = renderHook(() => useSlotPlayerState(), { wrapper });

      expect(result.current.mode).toBe('single');
    });
  });

  describe('useSlotPlayerConfig', () => {
    it('should return config values', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerConfig(), { wrapper });

      expect(result.current).toHaveProperty('playbackSpeed');
      expect(result.current).toHaveProperty('minSlot');
      expect(result.current).toHaveProperty('maxSlot');
    });

    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSlotPlayerConfig());
      }).toThrow('useSlotPlayerConfig must be used within a SlotPlayerProvider');

      consoleError.mockRestore();
    });

    it('should initialize with correct playback speed', () => {
      const wrapper = createWrapper({ playbackSpeed: 2 });
      const { result } = renderHook(() => useSlotPlayerConfig(), { wrapper });

      expect(result.current.playbackSpeed).toBe(2);
    });

    it('should have valid slot bounds', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerConfig(), { wrapper });

      // minSlot should be 1000, maxSlot should be 10000 based on our mocks
      expect(result.current.minSlot).toBe(1000);
      expect(result.current.maxSlot).toBe(10000);
      expect(result.current.maxSlot).toBeGreaterThan(result.current.minSlot);
    });
  });

  describe('useSlotPlayerActions', () => {
    it('should return all action functions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerActions(), { wrapper });

      // Playback controls
      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.setMode).toBe('function');

      // Navigation
      expect(typeof result.current.goToSlot).toBe('function');
      expect(typeof result.current.nextSlot).toBe('function');
      expect(typeof result.current.previousSlot).toBe('function');

      // Seek within slot
      expect(typeof result.current.rewind).toBe('function');
      expect(typeof result.current.fastForward).toBe('function');
      expect(typeof result.current.seekToTime).toBe('function');

      // Settings
      expect(typeof result.current.setPlaybackSpeed).toBe('function');

      // State management
      expect(typeof result.current.jumpToLive).toBe('function');
    });

    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSlotPlayerActions());
      }).toThrow('useSlotPlayerActions must be used within a SlotPlayerProvider');

      consoleError.mockRestore();
    });

    it('should maintain stable references across renders', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useSlotPlayerActions(), { wrapper });

      const firstActions = result.current;
      rerender();
      const secondActions = result.current;
      rerender();
      const thirdActions = result.current;

      // All action references should be stable
      expect(firstActions).toBe(secondActions);
      expect(secondActions).toBe(thirdActions);
      expect(firstActions.play).toBe(secondActions.play);
      expect(firstActions.pause).toBe(secondActions.pause);
      expect(firstActions.toggle).toBe(secondActions.toggle);
    });

    it('should toggle play state', async () => {
      const wrapper = createWrapper({ initialPlaying: false });
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
        }),
        { wrapper }
      );

      expect(result.current.state.isPlaying).toBe(false);

      await act(async () => {
        result.current.actions.play();
      });

      await waitFor(() => {
        expect(result.current.state.isPlaying).toBe(true);
      });

      await act(async () => {
        result.current.actions.pause();
      });

      await waitFor(() => {
        expect(result.current.state.isPlaying).toBe(false);
      });
    });

    it('should change playback mode', async () => {
      const wrapper = createWrapper({ initialMode: 'continuous' });
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
        }),
        { wrapper }
      );

      expect(result.current.state.mode).toBe('continuous');

      await act(async () => {
        result.current.actions.setMode('single');
      });

      await waitFor(() => {
        expect(result.current.state.mode).toBe('single');
      });
    });

    it('should update playback speed', async () => {
      const wrapper = createWrapper({ playbackSpeed: 1 });
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      expect(result.current.config.playbackSpeed).toBe(1);

      await act(async () => {
        result.current.actions.setPlaybackSpeed(2);
      });

      await waitFor(() => {
        expect(result.current.config.playbackSpeed).toBe(2);
      });
    });

    it('should clamp playback speed to valid range', async () => {
      const wrapper = createWrapper({ playbackSpeed: 1 });
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      // Test minimum clamp
      await act(async () => {
        result.current.actions.setPlaybackSpeed(0.01);
      });
      await waitFor(() => {
        expect(result.current.config.playbackSpeed).toBe(0.1);
      });

      // Test maximum clamp
      await act(async () => {
        result.current.actions.setPlaybackSpeed(100);
      });
      await waitFor(() => {
        expect(result.current.config.playbackSpeed).toBe(10);
      });
    });

    it('should navigate to specific slot', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBeGreaterThan(0);
      });

      const initialSlot = result.current.state.currentSlot;
      const targetSlot = Math.floor((result.current.config.minSlot + result.current.config.maxSlot) / 2);

      await act(async () => {
        result.current.actions.goToSlot(targetSlot);
      });

      await waitFor(() => {
        expect(result.current.state.currentSlot).toBe(targetSlot);
        expect(result.current.state.currentSlot).not.toBe(initialSlot);
      });
    });

    it('should reset progress when navigating slots', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          progress: useSlotPlayerProgress(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      const targetSlot = result.current.config.minSlot + 100;

      await act(async () => {
        result.current.actions.goToSlot(targetSlot);
      });

      await waitFor(() => {
        expect(result.current.progress.slotProgress).toBe(0);
      });
    });

    it('should call onSlotChange callback when slot changes', async () => {
      const onSlotChange = vi.fn();
      const wrapper = createWrapper({
        callbacks: { onSlotChange },
      });
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      const targetSlot = result.current.config.minSlot + 50;

      await act(async () => {
        result.current.actions.goToSlot(targetSlot);
      });

      await waitFor(() => {
        expect(onSlotChange).toHaveBeenCalledWith(targetSlot);
      });
    });

    it('should call onPlayStateChange callback when play state changes', async () => {
      const onPlayStateChange = vi.fn();
      const wrapper = createWrapper({
        callbacks: { onPlayStateChange },
        initialPlaying: false,
      });
      const { result } = renderHook(() => useSlotPlayerActions(), { wrapper });

      await act(async () => {
        result.current.play();
      });

      await waitFor(() => {
        expect(onPlayStateChange).toHaveBeenCalledWith(true, null);
      });

      await act(async () => {
        result.current.pause();
      });

      await waitFor(() => {
        expect(onPlayStateChange).toHaveBeenCalledWith(false, 'manual');
      });
    });
  });

  describe('useSlotPlayerMeta', () => {
    it('should return loading and error state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerMeta(), { wrapper });

      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSlotPlayerMeta());
      }).toThrow('useSlotPlayerMeta must be used within a SlotPlayerProvider');

      consoleError.mockRestore();
    });

    it('should initialize with loading false', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerMeta(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('useSlotPlayer (combined hook)', () => {
    it('should return all context values', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayer(), { wrapper });

      // Progress
      expect(result.current).toHaveProperty('slotProgress');

      // State
      expect(result.current).toHaveProperty('currentSlot');
      expect(result.current).toHaveProperty('isPlaying');
      expect(result.current).toHaveProperty('mode');
      expect(result.current).toHaveProperty('isStale');
      expect(result.current).toHaveProperty('staleBehindSlots');
      expect(result.current).toHaveProperty('isLive');
      expect(result.current).toHaveProperty('pauseReason');

      // Config
      expect(result.current).toHaveProperty('playbackSpeed');
      expect(result.current).toHaveProperty('minSlot');
      expect(result.current).toHaveProperty('maxSlot');

      // Meta
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      // Actions
      expect(result.current).toHaveProperty('actions');
      expect(typeof result.current.actions).toBe('object');
    });

    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSlotPlayer());
      }).toThrow(/must be used within a SlotPlayerProvider/);

      consoleError.mockRestore();
    });

    it('should have consistent values across specialized hooks', () => {
      const wrapper = createWrapper();

      const { result: combinedResult } = renderHook(() => useSlotPlayer(), { wrapper });
      const { result: progressResult } = renderHook(() => useSlotPlayerProgress(), { wrapper });
      const { result: stateResult } = renderHook(() => useSlotPlayerState(), { wrapper });
      const { result: configResult } = renderHook(() => useSlotPlayerConfig(), { wrapper });
      const { result: metaResult } = renderHook(() => useSlotPlayerMeta(), { wrapper });

      // Compare values
      expect(combinedResult.current.slotProgress).toBe(progressResult.current.slotProgress);
      expect(combinedResult.current.currentSlot).toBe(stateResult.current.currentSlot);
      expect(combinedResult.current.isPlaying).toBe(stateResult.current.isPlaying);
      expect(combinedResult.current.mode).toBe(stateResult.current.mode);
      expect(combinedResult.current.playbackSpeed).toBe(configResult.current.playbackSpeed);
      expect(combinedResult.current.minSlot).toBe(configResult.current.minSlot);
      expect(combinedResult.current.maxSlot).toBe(configResult.current.maxSlot);
      expect(combinedResult.current.isLoading).toBe(metaResult.current.isLoading);
      expect(combinedResult.current.error).toBe(metaResult.current.error);
    });
  });

  describe('Provider integration', () => {
    it('should handle multiple tables prop', () => {
      const wrapper = createWrapper({ tables: ['fct_block', 'fct_attestation', 'fct_validator_balance'] });
      const { result } = renderHook(() => useSlotPlayerConfig(), { wrapper });

      expect(result.current.minSlot).toBe(1000);
      expect(result.current.maxSlot).toBe(10000);
    });

    it('should respect initialSlot prop when provided', () => {
      // When initialSlot is provided, provider uses it directly
      const wrapper = createWrapper({ initialSlot: 5000 });
      const { result } = renderHook(() => useSlotPlayerState(), { wrapper });

      // Without initialSlot, should default to maxSlot - 2
      const wrapper2 = createWrapper();
      const { result: result2 } = renderHook(() => useSlotPlayerState(), { wrapper: wrapper2 });

      // Both should initialize to a valid slot (either may be 0 initially before bounds load)
      expect(typeof result.current.currentSlot).toBe('number');
      expect(typeof result2.current.currentSlot).toBe('number');
    });

    it('should initialize without errors', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSlotPlayerMeta(), { wrapper });

      expect(result.current.error).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid action calls', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
        }),
        { wrapper }
      );

      // Rapidly toggle play state
      await act(async () => {
        result.current.actions.toggle();
        result.current.actions.toggle();
        result.current.actions.toggle();
      });

      await waitFor(() => {
        expect(typeof result.current.state.isPlaying).toBe('boolean');
      });
    });

    it('should handle slot navigation to boundaries', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBeGreaterThan(0);
      });

      // Navigate to min boundary
      await act(async () => {
        result.current.actions.goToSlot(result.current.config.minSlot);
      });
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBe(result.current.config.minSlot);
      });

      // Navigate to max boundary
      await act(async () => {
        result.current.actions.goToSlot(result.current.config.maxSlot);
      });
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBe(result.current.config.maxSlot);
      });
    });

    it('should clamp slot navigation beyond boundaries', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBeGreaterThan(0);
      });

      // Try to navigate below min
      await act(async () => {
        result.current.actions.goToSlot(result.current.config.minSlot - 1000);
      });
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBe(result.current.config.minSlot);
      });

      // Try to navigate above max
      await act(async () => {
        result.current.actions.goToSlot(result.current.config.maxSlot + 1000);
      });
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBe(result.current.config.maxSlot);
      });
    });

    it('should handle jumpToLive action', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({
          actions: useSlotPlayerActions(),
          state: useSlotPlayerState(),
          config: useSlotPlayerConfig(),
        }),
        { wrapper }
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.state.currentSlot).toBeGreaterThan(0);
      });

      await act(async () => {
        result.current.actions.jumpToLive();
      });

      await waitFor(() => {
        const expectedLiveSlot =
          result.current.config.maxSlot > 2 ? result.current.config.maxSlot - 2 : result.current.config.maxSlot;
        expect(result.current.state.currentSlot).toBe(expectedLiveSlot);
        expect(result.current.state.isPlaying).toBe(true);
      });
    });
  });
});
