import { describe, it, expect } from 'vitest';

import { formatSmartDecimal, formatSlot, formatEpoch } from './number';

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

describe('formatSlot', () => {
  it('should format slot numbers without commas', () => {
    expect(formatSlot(1234567)).toBe('1234567');
    expect(formatSlot(100)).toBe('100');
    expect(formatSlot(0)).toBe('0');
  });

  it('should handle large slot numbers', () => {
    expect(formatSlot(10000000)).toBe('10000000');
    expect(formatSlot(999999999)).toBe('999999999');
  });

  it('should handle small slot numbers', () => {
    expect(formatSlot(1)).toBe('1');
    expect(formatSlot(42)).toBe('42');
  });
});

describe('formatEpoch', () => {
  it('should format epoch numbers without commas', () => {
    expect(formatEpoch(12345)).toBe('12345');
    expect(formatEpoch(100)).toBe('100');
    expect(formatEpoch(0)).toBe('0');
  });

  it('should handle large epoch numbers', () => {
    expect(formatEpoch(1000000)).toBe('1000000');
    expect(formatEpoch(999999)).toBe('999999');
  });

  it('should handle small epoch numbers', () => {
    expect(formatEpoch(1)).toBe('1');
    expect(formatEpoch(42)).toBe('42');
  });
});
