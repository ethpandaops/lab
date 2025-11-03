import { useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { EChartsInstance } from 'echarts-for-react';
import { useTheme } from '@/hooks/useTheme';
import type { ChartDownloadResult, UseChartDownloadOptions } from './useChartDownload.types';

/**
 * Hook for downloading ECharts charts with custom header and optional watermark
 *
 * @example
 * ```tsx
 * const { downloadChart } = useChartDownload();
 * const chartRef = useRef<ReactEChartsCore>(null);
 *
 * const handleDownload = () => {
 *   const instance = chartRef.current?.getEchartsInstance();
 *   if (instance) {
 *     downloadChart(instance, {
 *       filename: 'my-chart',
 *       watermark: true
 *     });
 *   }
 * };
 * ```
 */
export function useChartDownload(): ChartDownloadResult {
  // useTheme is optional - it may not be available in test environments or outside ThemeProvider
  let theme: 'light' | 'dark' = 'dark';
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch {
    // ThemeProvider not available - default to dark theme
    theme = 'dark';
  }

  /**
   * Get the background color based on current theme
   */
  const getBackgroundColor = useCallback((): string => {
    // Use theme-appropriate surface color
    // Light theme: sand-50 (#fafaf9), Dark theme: #242424
    return theme === 'light' ? '#fafaf9' : '#242424';
  }, [theme]);

  /**
   * Load an image and return as HTMLImageElement
   */
  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  /**
   * Compose chart image with header and optional watermark
   */
  const getComposedImageDataUrl = useCallback(
    async (chartInstance: EChartsInstance, options: UseChartDownloadOptions = {}): Promise<string> => {
      const {
        pixelRatio = 2,
        headerPath = '/images/header.png',
        backgroundColor = 'transparent',
        watermark = false,
        watermarkText = 'ethpandaops.io',
      } = options;

      // Get chart image data URL from ECharts instance
      const chartDataUrl = chartInstance.getDataURL({
        pixelRatio,
        backgroundColor,
        excludeComponents: ['toolbox'],
      });

      // Load images
      const [headerImg, chartImg] = await Promise.all([loadImage(headerPath), loadImage(chartDataUrl)]);

      // Calculate dimensions
      const headerHeight = 100; // Fixed header height
      const chartWidth = chartImg.width;
      const chartHeight = chartImg.height;
      const totalHeight = headerHeight + chartHeight;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = chartWidth;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Fill background if specified
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, chartWidth, totalHeight);
      }

      // Draw header (scaled to fit width, maintaining aspect ratio)
      const headerAspectRatio = headerImg.width / headerImg.height;
      const scaledHeaderHeight = Math.min(headerHeight, chartWidth / headerAspectRatio);
      const headerY = (headerHeight - scaledHeaderHeight) / 2;

      ctx.drawImage(headerImg, 0, headerY, chartWidth, scaledHeaderHeight);

      // Draw chart
      ctx.drawImage(chartImg, 0, headerHeight, chartWidth, chartHeight);

      // Add watermark if enabled
      if (watermark) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Position watermark in the center of the chart area
        const watermarkX = chartWidth / 2;
        const watermarkY = headerHeight + chartHeight / 2;

        ctx.fillText(watermarkText, watermarkX, watermarkY);
        ctx.restore();
      }

      return canvas.toDataURL('image/png');
    },
    [loadImage]
  );

  /**
   * Download the composed chart image
   */
  const downloadChart = useCallback(
    async (chartInstance: EChartsInstance, options: UseChartDownloadOptions = {}): Promise<void> => {
      const { filename = 'chart' } = options;

      // Get composed image data URL
      const dataUrl = await getComposedImageDataUrl(chartInstance, options);

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [getComposedImageDataUrl]
  );

  /**
   * Capture HTML element and compose with header
   */
  const getElementImageDataUrl = useCallback(
    async (element: HTMLElement, options: UseChartDownloadOptions = {}): Promise<string> => {
      const {
        pixelRatio = 2,
        headerPath = '/images/header.png',
        backgroundColor,
        watermark = false,
        watermarkText = 'ethpandaops.io',
        includeHeader = true,
      } = options;

      // Use theme-appropriate background color if not specified
      const bgColor = backgroundColor ?? getBackgroundColor();

      // Capture the HTML element as an image
      const elementDataUrl = await toPng(element, {
        pixelRatio,
        backgroundColor: bgColor,
        cacheBust: true,
      });

      // If no header needed, return the element image directly
      if (!includeHeader) {
        return elementDataUrl;
      }

      // Load images
      const [headerImg, elementImg] = await Promise.all([loadImage(headerPath), loadImage(elementDataUrl)]);

      // Calculate dimensions
      const headerHeight = 100; // Fixed header height
      const elementWidth = elementImg.width;
      const elementHeight = elementImg.height;
      const totalHeight = headerHeight + elementHeight;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = elementWidth;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, elementWidth, totalHeight);

      // Draw header (scaled to fit width, maintaining aspect ratio)
      const headerAspectRatio = headerImg.width / headerImg.height;
      const scaledHeaderHeight = Math.min(headerHeight, elementWidth / headerAspectRatio);
      const headerY = (headerHeight - scaledHeaderHeight) / 2;

      ctx.drawImage(headerImg, 0, headerY, elementWidth, scaledHeaderHeight);

      // Draw element image
      ctx.drawImage(elementImg, 0, headerHeight, elementWidth, elementHeight);

      // Add watermark if enabled
      if (watermark) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Position watermark in the center of the element area
        const watermarkX = elementWidth / 2;
        const watermarkY = headerHeight + elementHeight / 2;

        ctx.fillText(watermarkText, watermarkX, watermarkY);
        ctx.restore();
      }

      return canvas.toDataURL('image/png');
    },
    [loadImage, getBackgroundColor]
  );

  /**
   * Download HTML element as image
   */
  const downloadElement = useCallback(
    async (element: HTMLElement, options: UseChartDownloadOptions = {}): Promise<void> => {
      const { filename = 'chart' } = options;

      // Get composed image data URL
      const dataUrl = await getElementImageDataUrl(element, options);

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [getElementImageDataUrl]
  );

  return {
    downloadChart,
    getComposedImageDataUrl,
    downloadElement,
    getElementImageDataUrl,
  };
}
