import { describe, it, expect } from 'vitest';

import { formatSmartDecimal } from './number';

describe('formatSmartDecimal', () => {
  it('should format whole numbers without decimals', () => {
    expect(formatSmartDecimal(100)).toBe('100');
    expect(formatSmartDecimal(0)).toBe('0');
    expect(formatSmartDecimal(42)).toBe('42');
  });

  it('should format numbers with decimals only when needed', () => {
    expect(formatSmartDecimal(100.5)).toBe('100.5');
    expect(formatSmartDecimal(99.1)).toBe('99.1');
    expect(formatSmartDecimal(0.5)).toBe('0.5');
  });

  it('should round to max decimals (default 2)', () => {
    expect(formatSmartDecimal(100.123)).toBe('100.12');
    expect(formatSmartDecimal(99.9999)).toBe('100');
    expect(formatSmartDecimal(42.567)).toBe('42.57');
  });

  it('should respect custom maxDecimals parameter', () => {
    expect(formatSmartDecimal(100.123, 1)).toBe('100.1');
    expect(formatSmartDecimal(100.567, 1)).toBe('100.6');
    expect(formatSmartDecimal(100.123456, 3)).toBe('100.123');
    expect(formatSmartDecimal(100.999, 1)).toBe('101');
  });

  it('should not show trailing zeros', () => {
    expect(formatSmartDecimal(100.1, 2)).toBe('100.1');
    expect(formatSmartDecimal(100.01, 2)).toBe('100.01');
    expect(formatSmartDecimal(100.0, 2)).toBe('100');
  });

  it('should handle edge cases', () => {
    expect(formatSmartDecimal(0.0001, 2)).toBe('0');
    expect(formatSmartDecimal(0.01, 2)).toBe('0.01');
    expect(formatSmartDecimal(-100.5)).toBe('-100.5');
    expect(formatSmartDecimal(-100)).toBe('-100');
  });
});
