import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChartDownload } from './useChartDownload';
import type { EChartsInstance } from 'echarts-for-react';

describe('useChartDownload', () => {
  let mockChartInstance: Partial<EChartsInstance>;
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockContext: Partial<CanvasRenderingContext2D>;

  beforeEach(() => {
    // Mock chart instance
    mockChartInstance = {
      getDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockChartData'),
    };

    // Mock Image constructor
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      crossOrigin = '';
      width = 800;
      height = 600;

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as unknown as typeof Image;

    // Mock canvas and context
    mockContext = {
      fillStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockComposedData'),
    };

    global.document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as HTMLCanvasElement;
      }
      if (tagName === 'a') {
        return {
          download: '',
          href: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
      }
      return {} as HTMLElement;
    });

    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return downloadChart and getComposedImageDataUrl functions', () => {
    const { result } = renderHook(() => useChartDownload());

    expect(result.current).toHaveProperty('downloadChart');
    expect(result.current).toHaveProperty('getComposedImageDataUrl');
    expect(typeof result.current.downloadChart).toBe('function');
    expect(typeof result.current.getComposedImageDataUrl).toBe('function');
  });

  it('should call getDataURL with correct parameters', async () => {
    const { result } = renderHook(() => useChartDownload());

    await result.current.getComposedImageDataUrl(mockChartInstance as EChartsInstance, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
    });

    expect(mockChartInstance.getDataURL).toHaveBeenCalledWith({
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      excludeComponents: ['toolbox'],
    });
  });

  it('should create canvas with correct dimensions', async () => {
    const { result } = renderHook(() => useChartDownload());

    await result.current.getComposedImageDataUrl(mockChartInstance as EChartsInstance);

    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(700); // 100 header + 600 chart
  });

  it('should draw header and chart on canvas', async () => {
    const { result } = renderHook(() => useChartDownload());

    await result.current.getComposedImageDataUrl(mockChartInstance as EChartsInstance);

    expect(mockContext.drawImage).toHaveBeenCalledTimes(2);
  });

  it('should add watermark when enabled', async () => {
    const { result } = renderHook(() => useChartDownload());

    await result.current.getComposedImageDataUrl(mockChartInstance as EChartsInstance, {
      watermark: true,
      watermarkText: 'Custom Watermark',
    });

    expect(mockContext.fillText).toHaveBeenCalledWith('Custom Watermark', expect.any(Number), expect.any(Number));
  });

  it('should not add watermark when disabled', async () => {
    const { result } = renderHook(() => useChartDownload());

    await result.current.getComposedImageDataUrl(mockChartInstance as EChartsInstance, {
      watermark: false,
    });

    expect(mockContext.fillText).not.toHaveBeenCalled();
  });

  it('should trigger download with correct filename', async () => {
    const { result } = renderHook(() => useChartDownload());
    const mockLink = {
      download: '',
      href: '',
      click: vi.fn(),
    };

    global.document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as unknown as HTMLAnchorElement;
      }
      if (tagName === 'canvas') {
        return mockCanvas as HTMLCanvasElement;
      }
      return {} as HTMLElement;
    });

    await result.current.downloadChart(mockChartInstance as EChartsInstance, {
      filename: 'test-chart',
    });

    expect(mockLink.download).toBe('test-chart.png');
    expect(mockLink.click).toHaveBeenCalled();
  });
});
