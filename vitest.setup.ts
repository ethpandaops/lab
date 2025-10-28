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

  // Mock DOM dimensions for ECharts (jsdom doesn't compute actual dimensions)
  // This fixes "Can't get DOM width or height" warnings in tests
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 800,
  });

  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 600,
  });

  // Mock ResizeObserver for ECharts and echarts-for-react
  // This fixes "Cannot read properties of undefined (reading 'disconnect')" errors
  // Using regular function constructor (not arrow function) for proper instantiation
  const ResizeObserverMock = vi.fn(function (this: ResizeObserver) {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  });

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});
