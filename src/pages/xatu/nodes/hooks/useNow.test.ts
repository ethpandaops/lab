import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from './useNow';

/** A fixed minute boundary, so the clock's first value is a whole number of seconds */
const NOW_MS = Date.UTC(2026, 0, 15, 12, 0, 0);

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(NOW_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the clock once, then moves on every minute', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toBe(NOW_MS / 1000);

    act(() => vi.advanceTimersByTime(59_000));
    expect(result.current).toBe(NOW_MS / 1000);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(NOW_MS / 1000 + 60);
  });
});
