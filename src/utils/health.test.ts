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
  it.each([
    [100, 'success'],
    [99, 'success'],
    [98.99, 'muted'],
    [95, 'muted'],
    [94.99, 'warning'],
    [66.67, 'warning'],
    [66.66, 'danger'],
    [0.1, 'danger'],
    [0, 'muted'],
  ] as const)('returns %s%% as %s', (percentage, expected) => {
    expect(getHealthColor(percentage, mockColors)).toBe(mockColors[expected]);
  });
});
