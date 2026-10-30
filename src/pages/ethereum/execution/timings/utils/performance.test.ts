import { describe, expect, it } from 'vitest';
import { chainDemand, gasCeiling, linearFit, mgasPerSecond, normalizeClient } from './performance';

describe('linearFit', () => {
  it('recovers overhead and marginal cost from noisy-free points', () => {
    // 7 ms overhead + 1.5 ms per Mgas
    const points: [number, number][] = [5, 12, 30, 47, 60].map(g => [g, 7 + 1.5 * g]);
    const fit = linearFit(points);
    expect(fit.intercept).toBeCloseTo(7, 10);
    expect(fit.slope).toBeCloseTo(1.5, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
  });
});

describe('gasCeiling', () => {
  it('is the block size whose fitted duration equals the budget', () => {
    expect(gasCeiling({ intercept: 10, slope: 2.5, r2: 1 }, 1000)).toBeCloseTo(396);
  });

  it('ignores a negative fitted overhead', () => {
    expect(gasCeiling({ intercept: -20, slope: 2, r2: 1 }, 500)).toBe(250);
  });
});

describe('mgasPerSecond', () => {
  it('converts gas over milliseconds to Mgas/s', () => {
    expect(mgasPerSecond(30_000_000, 50)).toBe(600);
    expect(mgasPerSecond(30_000_000, 0)).toBe(0);
  });
});

describe('chainDemand', () => {
  it('spreads gas used over 12 s per block', () => {
    expect(
      chainDemand([
        { total_gas_used: 9_000_000_000, block_count: 300 },
        { total_gas_used: 3_000_000_000, block_count: 100 },
      ])
    ).toBeCloseTo(2.5);
  });
});

describe('normalizeClient', () => {
  it('lowercases and folds go-ethereum into geth', () => {
    expect(normalizeClient('go-ethereum')).toBe('geth');
    expect(normalizeClient('Nethermind')).toBe('nethermind');
    expect(normalizeClient(undefined)).toBe('unknown');
  });
});
