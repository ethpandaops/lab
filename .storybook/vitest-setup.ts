import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as projectAnnotations from './preview';

setProjectAnnotations([projectAnnotations]);

// Setup mocks for ECharts v6 test environment
beforeAll(() => {
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
