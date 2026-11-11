import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { JSX, ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  useSlotPlayerActions,
  useSlotPlayerConfig,
  useSlotPlayerProgress,
  useSlotPlayerState,
} from '@/hooks/useSlotPlayer';
import type {
  SlotPlayerActions,
  SlotPlayerConfigContextValue,
  SlotPlayerProgressContextValue,
  SlotPlayerStateContextValue,
} from '@/contexts/SlotPlayerContext';
import { SlotPlayerProvider } from './SlotPlayerProvider';

const GENESIS_TIME = 1606824023;

// The bounds the mocked API reports, as slots; a slot plays in 1.2 s at 10x
const bounds = vi.hoisted(() => ({ data: {} }));

function setBounds(minSlot: number, maxSlot: number): void {
  const min = GENESIS_TIME + minSlot * 12;
  const max = GENESIS_TIME + maxSlot * 12;
  bounds.data = { aggregate: { minOfMins: min, maxOfMins: min, minOfMaxes: max, maxOfMaxes: max } };
}

vi.mock('@/hooks/useBounds', () => ({
  useTablesBounds: () => ({ data: bounds.data, isLoading: false, error: null }),
}));

vi.mock('@/hooks/useBeaconClock', () => ({
  useBeaconClock: () => ({ slot: 10000, epoch: 312 }),
}));

vi.mock('@/hooks/useNetwork', () => {
  const currentNetwork = { name: 'mainnet', genesis_time: 1606824023 };
  return { useNetwork: () => ({ currentNetwork }) };
});

interface Player {
  state: SlotPlayerStateContextValue;
  progress: SlotPlayerProgressContextValue;
  actions: SlotPlayerActions;
  config: SlotPlayerConfigContextValue;
}

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SlotPlayerProvider tables={['fct_block']} initialPlaying playbackSpeed={10}>
      {children}
    </SlotPlayerProvider>
  );
}

function renderPlayer(): { result: { current: Player }; rerender: () => void } {
  return renderHook(
    (): Player => ({
      state: useSlotPlayerState(),
      progress: useSlotPlayerProgress(),
      actions: useSlotPlayerActions(),
      config: useSlotPlayerConfig(),
    }),
    { wrapper: Wrapper }
  );
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('SlotPlayerProvider playback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
      ],
    });
    setBounds(1000, 10000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses at the live edge and resumes once newer slots arrive', () => {
    const { result, rerender } = renderPlayer();
    expect(result.current.state.currentSlot).toBe(9998);

    advance(1250);
    advance(1250);
    advance(1250);
    expect(result.current.state.currentSlot).toBe(10000);
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.pauseReason).toBe('boundary');

    advance(500);
    expect(result.current.state.isPlaying).toBe(false);

    setBounds(1000, 10002);
    rerender();
    advance(100);
    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.state.pauseReason).toBeNull();
    expect(result.current.state.currentSlot).toBe(10001);
  });

  it('resumes when newer slots arrive in the same render as the pause', () => {
    const { result } = renderPlayer();
    advance(2500);
    expect(result.current.state.currentSlot).toBe(10000);

    act(() => {
      vi.advanceTimersByTime(1250);
      setBounds(1000, 10002);
    });
    advance(100);
    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.state.currentSlot).toBe(10001);
  });

  it('stays paused at the live edge after a manual pause', () => {
    const { result, rerender } = renderPlayer();
    advance(3750);
    act(() => {
      result.current.actions.pause();
    });

    setBounds(1000, 10005);
    rerender();
    advance(500);
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.pauseReason).toBe('manual');
    expect(result.current.state.currentSlot).toBe(10000);
  });

  it('keeps the slot within updated bounds, restarting its progress', () => {
    const { result, rerender } = renderPlayer();
    advance(600);
    act(() => {
      result.current.actions.pause();
    });
    expect(result.current.progress.slotProgress).toBeGreaterThan(4000);

    setBounds(1000, 9000);
    rerender();
    expect(result.current.state.currentSlot).toBe(9000);
    expect(result.current.progress.slotProgress).toBe(0);

    act(() => {
      result.current.actions.play();
    });
    advance(200);
    expect(result.current.state.currentSlot).toBe(9000);
    expect(result.current.progress.slotProgress).toBeGreaterThan(0);
    expect(result.current.progress.slotProgress).toBeLessThan(3000);
  });
});
