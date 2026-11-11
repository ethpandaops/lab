import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@/test-utils';
import { NOW_MS } from '@/test-utils/time';
import { useNow } from './useNow';

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
