import { describe, it, expect } from 'vitest';
import { formatGasToMillions, formatGasWithPercentage } from './gas';

describe('formatGasToMillions', () => {
  it('should format 30M gas with default 1 decimal', () => {
    expect(formatGasToMillions(30000000)).toBe('30.0M');
  });

  it('should format 30M gas with 2 decimals', () => {
    expect(formatGasToMillions(30000000, 2)).toBe('30.00M');
  });

  it('should format 15.5M gas with 1 decimal', () => {
    expect(formatGasToMillions(15500000)).toBe('15.5M');
  });

  it('should format gas with 0 decimals', () => {
    expect(formatGasToMillions(30000000, 0)).toBe('30M');
  });

  it('should handle zero gas', () => {
    expect(formatGasToMillions(0)).toBe('0.0M');
    expect(formatGasToMillions(0, 2)).toBe('0.00M');
  });

  it('should handle very large gas values', () => {
    expect(formatGasToMillions(100000000)).toBe('100.0M');
    expect(formatGasToMillions(999999999)).toBe('1000.0M');
  });

  it('should handle small gas values', () => {
    expect(formatGasToMillions(500000)).toBe('0.5M');
    expect(formatGasToMillions(100000)).toBe('0.1M');
  });

  it('should handle fractional millions precisely', () => {
    expect(formatGasToMillions(1234567, 2)).toBe('1.23M');
    expect(formatGasToMillions(1234567, 3)).toBe('1.235M');
  });

  it('should round correctly', () => {
    expect(formatGasToMillions(15555555, 1)).toBe('15.6M');
    expect(formatGasToMillions(15544444, 1)).toBe('15.5M');
  });
});

describe('formatGasWithPercentage', () => {
  it('should format gas at 100% usage', () => {
    expect(formatGasWithPercentage(30000000, 30000000)).toBe('30.0M / 30M (100.0%)');
  });

  it('should format gas at 50% usage', () => {
    expect(formatGasWithPercentage(15000000, 30000000)).toBe('15.0M / 30M (50.0%)');
  });

  it('should format gas with custom decimals for used', () => {
    expect(formatGasWithPercentage(15500000, 30000000, 2)).toBe('15.50M / 30M (51.7%)');
  });

  it('should format gas with custom decimals for limit', () => {
    expect(formatGasWithPercentage(15000000, 30000000, 1, 1)).toBe('15.0M / 30.0M (50.0%)');
  });

  it('should return "N/A" when used is null', () => {
    expect(formatGasWithPercentage(null, 30000000)).toBe('N/A');
  });

  it('should return "N/A" when used is undefined', () => {
    expect(formatGasWithPercentage(undefined, 30000000)).toBe('N/A');
  });

  it('should return "N/A" when limit is null', () => {
    expect(formatGasWithPercentage(30000000, null)).toBe('N/A');
  });

  it('should return "N/A" when limit is undefined', () => {
    expect(formatGasWithPercentage(30000000, undefined)).toBe('N/A');
  });

  it('should return "N/A" when both are null', () => {
    expect(formatGasWithPercentage(null, null)).toBe('N/A');
  });

  it('should return "N/A" when used is zero', () => {
    expect(formatGasWithPercentage(0, 30000000)).toBe('N/A');
  });

  it('should handle overflow (used > limit)', () => {
    expect(formatGasWithPercentage(35000000, 30000000)).toBe('35.0M / 30M (116.7%)');
  });

  it('should handle very low usage percentage', () => {
    expect(formatGasWithPercentage(100000, 30000000)).toBe('0.1M / 30M (0.3%)');
  });

  it('should handle very high usage percentage', () => {
    expect(formatGasWithPercentage(29999999, 30000000)).toBe('30.0M / 30M (100.0%)');
  });

  it('should format percentage with one decimal place', () => {
    expect(formatGasWithPercentage(12345678, 30000000)).toBe('12.3M / 30M (41.2%)');
  });

  it('should handle edge case with very small values', () => {
    expect(formatGasWithPercentage(1, 1000000)).toBe('0.0M / 1M (0.0%)');
  });
});
