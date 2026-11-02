import { describe, expect, it } from 'vitest';

import { daysBack, entitiesToReach, sampleDays } from './overview';

describe('daysBack', () => {
  it('steps back from the latest day and keeps the oldest day first', () => {
    expect(daysBack('2024-01-01', '2024-01-20', 7)).toEqual(['2024-01-06', '2024-01-13', '2024-01-20']);
  });

  it('crosses month and leap-day boundaries', () => {
    expect(daysBack('2024-02-27', '2024-03-01', 1)).toEqual(['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']);
  });
});

describe('sampleDays', () => {
  it('includes both ends and spaces the rest evenly', () => {
    expect(sampleDays('2024-01-01', '2024-01-31', 4)).toEqual(['2024-01-01', '2024-01-11', '2024-01-21', '2024-01-31']);
  });

  it('returns each day once when the span is shorter than the count', () => {
    expect(sampleDays('2024-01-01', '2024-01-03', 13)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
  });
});

describe('entitiesToReach', () => {
  it('counts the largest stakes first, whatever order they come in', () => {
    // Aggregates hold the other 35 of the 100, so the named entities alone total 65
    expect(entitiesToReach([5, 30, 10, 20], 100, 1 / 3)).toEqual({ count: 2, share: 0.5 });
  });

  it('stops on the stake that lands exactly on the threshold', () => {
    expect(entitiesToReach([20, 40, 15], 60, 2 / 3)).toEqual({ count: 1, share: 40 / 60 });
  });

  it('returns null when every stake together falls short', () => {
    expect(entitiesToReach([10, 10], 100, 1 / 3)).toBeNull();
  });
});
