import { describe, it, expect } from 'vitest';
import { spreadDates } from './useNodeVersions';

describe('spreadDates', () => {
  const now = Date.UTC(2026, 10, 2, 15); // 2026-11-02, mid-afternoon
  const daysAgo = (days: number): number => Date.UTC(2026, 10, 2 - days) / 1000;

  it('should list every day when the window fits', () => {
    expect(spreadDates(daysAgo(2), 5, now)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('should spread a long window evenly from its first day to today', () => {
    const dates = spreadDates(daysAgo(364), 4, now);
    expect(dates).toEqual(['2025-11-03', '2026-03-04', '2026-07-04', '2026-11-02']);
  });
});
