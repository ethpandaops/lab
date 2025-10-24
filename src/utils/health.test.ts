import { describe, it, expect } from 'vitest';
import { getHealthColor } from './health';
import type { ThemeColors } from '@/hooks/useThemeColors';

const mockColors: ThemeColors = {
  primary: '#primary',
  secondary: '#secondary',
  accent: '#accent',
  background: '#background',
  surface: '#surface',
  foreground: '#foreground',
  muted: '#muted',
  border: '#border',
  success: '#success',
  warning: '#warning',
  danger: '#danger',
};

describe('getHealthColor', () => {
  describe('success threshold (>= 90%)', () => {
    it('should return success for 90%', () => {
      expect(getHealthColor(90, mockColors)).toBe(mockColors.success);
    });

    it('should return success for 95%', () => {
      expect(getHealthColor(95, mockColors)).toBe(mockColors.success);
    });

    it('should return success for 100%', () => {
      expect(getHealthColor(100, mockColors)).toBe(mockColors.success);
    });

    it('should return success for 99.9%', () => {
      expect(getHealthColor(99.9, mockColors)).toBe(mockColors.success);
    });

    it('should return success for values > 100%', () => {
      expect(getHealthColor(105, mockColors)).toBe(mockColors.success);
    });
  });

  describe('warning threshold (70-89%)', () => {
    it('should return warning for 70%', () => {
      expect(getHealthColor(70, mockColors)).toBe(mockColors.warning);
    });

    it('should return warning for 80%', () => {
      expect(getHealthColor(80, mockColors)).toBe(mockColors.warning);
    });

    it('should return warning for 89%', () => {
      expect(getHealthColor(89, mockColors)).toBe(mockColors.warning);
    });

    it('should return warning for 89.9%', () => {
      expect(getHealthColor(89.9, mockColors)).toBe(mockColors.warning);
    });

    it('should return warning for 75.5%', () => {
      expect(getHealthColor(75.5, mockColors)).toBe(mockColors.warning);
    });
  });

  describe('danger threshold (1-69%)', () => {
    it('should return danger for 1%', () => {
      expect(getHealthColor(1, mockColors)).toBe(mockColors.danger);
    });

    it('should return danger for 50%', () => {
      expect(getHealthColor(50, mockColors)).toBe(mockColors.danger);
    });

    it('should return danger for 69%', () => {
      expect(getHealthColor(69, mockColors)).toBe(mockColors.danger);
    });

    it('should return danger for 69.9%', () => {
      expect(getHealthColor(69.9, mockColors)).toBe(mockColors.danger);
    });

    it('should return danger for 25.5%', () => {
      expect(getHealthColor(25.5, mockColors)).toBe(mockColors.danger);
    });

    it('should return danger for 0.1%', () => {
      expect(getHealthColor(0.1, mockColors)).toBe(mockColors.danger);
    });
  });

  describe('muted threshold (0%)', () => {
    it('should return muted for 0%', () => {
      expect(getHealthColor(0, mockColors)).toBe(mockColors.muted);
    });

    it('should return muted for -0 (negative zero)', () => {
      expect(getHealthColor(-0, mockColors)).toBe(mockColors.muted);
    });
  });

  describe('boundary conditions', () => {
    it('should return success at exactly 90% boundary', () => {
      expect(getHealthColor(90.0, mockColors)).toBe(mockColors.success);
    });

    it('should return warning just below 90%', () => {
      expect(getHealthColor(89.99999, mockColors)).toBe(mockColors.warning);
    });

    it('should return warning at exactly 70% boundary', () => {
      expect(getHealthColor(70.0, mockColors)).toBe(mockColors.warning);
    });

    it('should return danger just below 70%', () => {
      expect(getHealthColor(69.99999, mockColors)).toBe(mockColors.danger);
    });

    it('should return danger just above 0%', () => {
      expect(getHealthColor(0.00001, mockColors)).toBe(mockColors.danger);
    });
  });

  describe('edge cases', () => {
    it('should handle negative percentages', () => {
      expect(getHealthColor(-10, mockColors)).toBe(mockColors.muted);
    });

    it('should handle very large percentages', () => {
      expect(getHealthColor(1000, mockColors)).toBe(mockColors.success);
    });

    it('should handle decimal precision', () => {
      expect(getHealthColor(90.000001, mockColors)).toBe(mockColors.success);
      expect(getHealthColor(89.999999, mockColors)).toBe(mockColors.warning);
      expect(getHealthColor(70.000001, mockColors)).toBe(mockColors.warning);
      expect(getHealthColor(69.999999, mockColors)).toBe(mockColors.danger);
    });
  });
});
