import { describe, it, expect } from 'vitest';
import { getHealthColor } from './health';

describe('getHealthColor', () => {
  describe('green threshold (>= 90%)', () => {
    it('should return green for 90%', () => {
      expect(getHealthColor(90)).toBe('#22c55e');
    });

    it('should return green for 95%', () => {
      expect(getHealthColor(95)).toBe('#22c55e');
    });

    it('should return green for 100%', () => {
      expect(getHealthColor(100)).toBe('#22c55e');
    });

    it('should return green for 99.9%', () => {
      expect(getHealthColor(99.9)).toBe('#22c55e');
    });

    it('should return green for values > 100%', () => {
      expect(getHealthColor(105)).toBe('#22c55e');
    });
  });

  describe('amber threshold (70-89%)', () => {
    it('should return amber for 70%', () => {
      expect(getHealthColor(70)).toBe('#f59e0b');
    });

    it('should return amber for 80%', () => {
      expect(getHealthColor(80)).toBe('#f59e0b');
    });

    it('should return amber for 89%', () => {
      expect(getHealthColor(89)).toBe('#f59e0b');
    });

    it('should return amber for 89.9%', () => {
      expect(getHealthColor(89.9)).toBe('#f59e0b');
    });

    it('should return amber for 75.5%', () => {
      expect(getHealthColor(75.5)).toBe('#f59e0b');
    });
  });

  describe('red threshold (1-69%)', () => {
    it('should return red for 1%', () => {
      expect(getHealthColor(1)).toBe('#ef4444');
    });

    it('should return red for 50%', () => {
      expect(getHealthColor(50)).toBe('#ef4444');
    });

    it('should return red for 69%', () => {
      expect(getHealthColor(69)).toBe('#ef4444');
    });

    it('should return red for 69.9%', () => {
      expect(getHealthColor(69.9)).toBe('#ef4444');
    });

    it('should return red for 25.5%', () => {
      expect(getHealthColor(25.5)).toBe('#ef4444');
    });

    it('should return red for 0.1%', () => {
      expect(getHealthColor(0.1)).toBe('#ef4444');
    });
  });

  describe('gray threshold (0%)', () => {
    it('should return gray for 0%', () => {
      expect(getHealthColor(0)).toBe('#888888');
    });

    it('should return gray for -0 (negative zero)', () => {
      expect(getHealthColor(-0)).toBe('#888888');
    });
  });

  describe('boundary conditions', () => {
    it('should return green at exactly 90% boundary', () => {
      expect(getHealthColor(90.0)).toBe('#22c55e');
    });

    it('should return amber just below 90%', () => {
      expect(getHealthColor(89.99999)).toBe('#f59e0b');
    });

    it('should return amber at exactly 70% boundary', () => {
      expect(getHealthColor(70.0)).toBe('#f59e0b');
    });

    it('should return red just below 70%', () => {
      expect(getHealthColor(69.99999)).toBe('#ef4444');
    });

    it('should return red just above 0%', () => {
      expect(getHealthColor(0.00001)).toBe('#ef4444');
    });
  });

  describe('edge cases', () => {
    it('should handle negative percentages', () => {
      expect(getHealthColor(-10)).toBe('#888888');
    });

    it('should handle very large percentages', () => {
      expect(getHealthColor(1000)).toBe('#22c55e');
    });

    it('should handle decimal precision', () => {
      expect(getHealthColor(90.000001)).toBe('#22c55e');
      expect(getHealthColor(89.999999)).toBe('#f59e0b');
      expect(getHealthColor(70.000001)).toBe('#f59e0b');
      expect(getHealthColor(69.999999)).toBe('#ef4444');
    });
  });
});
