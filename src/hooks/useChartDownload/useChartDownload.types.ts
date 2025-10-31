import type { EChartsInstance } from 'echarts-for-react';

export interface UseChartDownloadOptions {
  /**
   * Pixel ratio for higher quality exports (default: 2)
   */
  pixelRatio?: number;

  /**
   * Path to the logo image (default: '/images/ethpandaops.png')
   */
  logoPath?: string;

  /**
   * Path to the header image (default: '/images/header.png')
   */
  headerPath?: string;

  /**
   * Background color for the composed image (default: transparent)
   */
  backgroundColor?: string;

  /**
   * Whether to add a watermark to the chart (default: false)
   */
  watermark?: boolean;

  /**
   * Custom watermark text (default: 'ethpandaops.io')
   */
  watermarkText?: string;

  /**
   * Custom filename for the download (without extension)
   */
  filename?: string;

  /**
   * Whether to include the header image in the final composition (default: true)
   */
  includeHeader?: boolean;
}

export interface ChartDownloadResult {
  /**
   * Function to download the chart with header and optional watermark
   * @deprecated Use downloadElement for full component capture including PopoutCard
   */
  downloadChart: (chartInstance: EChartsInstance, options?: UseChartDownloadOptions) => Promise<void>;

  /**
   * Function to get the composed image data URL without downloading
   * @deprecated Use getElementImageDataUrl for full component capture
   */
  getComposedImageDataUrl: (chartInstance: EChartsInstance, options?: UseChartDownloadOptions) => Promise<string>;

  /**
   * Function to download an entire HTML element (e.g., PopoutCard with chart, title, subtitle)
   */
  downloadElement: (element: HTMLElement, options?: UseChartDownloadOptions) => Promise<void>;

  /**
   * Function to get the composed image data URL from an HTML element
   */
  getElementImageDataUrl: (element: HTMLElement, options?: UseChartDownloadOptions) => Promise<string>;
}
