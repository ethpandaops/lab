import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';

// Suppress console warnings during tests to keep output clean
beforeAll(() => {
  const originalWarn = console.warn;
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    // Only suppress expected parser warnings, let others through
    const message = args[0]?.toString() || '';
    if (message.includes('Failed to parse') || message.includes('Validation error')) {
      return;
    }
    originalWarn(...args);
  });
});
