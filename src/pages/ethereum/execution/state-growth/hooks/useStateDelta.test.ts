import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStateDelta } from './useStateDelta';
import type { NormalizedDataPoint } from './useStateSizeData';

function point(day: string, totalBytes: number): NormalizedDataPoint {
  return {
    date: new Date(`${day}T00:00:00Z`),
    dateLabel: day,
    total_bytes: totalBytes,
    account_bytes: 0,
    account_trienode_bytes: 0,
    storage_bytes: 0,
    storage_trienode_bytes: 0,
    contract_code_bytes: 0,
    accounts: 0,
    storages: 0,
    contract_codes: 0,
  };
}

// mainnet fct_execution_state_size_daily; the 2026-11-04 row was written at 10:52 UTC that day
const DATA = [
  point('2026-10-27', 335_000_000_000),
  point('2026-11-01', 336_299_483_372),
  point('2026-11-02', 336_510_051_819),
  point('2026-11-03', 336_707_640_504),
  point('2026-11-04', 336_763_997_974),
];

describe('useStateDelta', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ends at the last complete UTC day, leaving out today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T11:00:00Z'));
    const { result } = renderHook(() => useStateDelta(DATA, 'daily'));

    expect(result.current?.currentDate).toBe('2026-11-03');
    expect(result.current?.previousDate).toBe('2026-11-02');
    expect(result.current?.total.delta).toBe(197_588_685);
  });

  it('starts at the nearest earlier day when the day N days back has no row', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T11:00:00Z'));
    const { result } = renderHook(() => useStateDelta(DATA, 'weekly'));

    expect(result.current?.currentDate).toBe('2026-11-03');
    expect(result.current?.previousDate).toBe('2026-10-27');
  });

  it('compares against the first row for all', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T11:00:00Z'));
    const { result } = renderHook(() => useStateDelta(DATA, 'all'));

    expect(result.current?.currentDate).toBe('2026-11-03');
    expect(result.current?.previousDate).toBe('2026-10-27');
    expect(result.current?.total.delta).toBe(1_707_640_504);
  });
});
