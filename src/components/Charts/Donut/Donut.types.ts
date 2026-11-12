import type { Ref } from 'react';
import type ReactEChartsCore from 'echarts-for-react/lib/core';

/**
 * Configuration for a single donut segment
 */
interface DonutDataItem {
  /**
   * Display name for this segment
   */
  name: string;
  /**
   * Value for this segment
   */
  value: number;
  /**
   * Optional custom color (hex) for this segment
   * Falls back to categorical color palette if not provided
   */
  color?: string;
}

/**
 * Props for the Donut component
 */
export interface DonutProps {
  /**
   * Ref to the underlying echarts-for-react instance
   */
  ref?: Ref<ReactEChartsCore>;
  /**
   * Array of data items to display in the donut chart
   */
  data: DonutDataItem[];
  /**
   * Height of the chart in pixels or '100%'
   * @default 400
   */
  height?: number | string;
  /**
   * Chart title
   */
  title?: string;
  /**
   * Title font size in pixels
   * @default 16
   */
  titleFontSize?: number;
  /**
   * Title font family
   */
  titleFontFamily?: string;
  /**
   * Title font weight
   * @default 600
   */
  titleFontWeight?: number;
  /**
   * Title horizontal alignment
   * @default 'center'
   */
  titleLeft?: number | string;
  /**
   * Title top offset in pixels
   * @default 8
   */
  titleTop?: number;
  /**
   * Inner radius as percentage (creates the donut hole)
   * @default 40
   */
  innerRadius?: number;
  /**
   * Outer radius as percentage
   * @default 70
   */
  outerRadius?: number;
  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean;
  /**
   * Legend position ('top' | 'bottom' | 'left' | 'right')
   * @default 'top'
   */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Legend orientation ('horizontal' | 'vertical')
   * @default 'horizontal'
   */
  legendOrientation?: 'horizontal' | 'vertical';
  /**
   * Show labels on segments
   * @default false
   */
  showLabel?: boolean;
  /**
   * Label position ('center' | 'inside' | 'outside')
   * @default 'center'
   */
  labelPosition?: 'center' | 'inside' | 'outside';
  /**
   * Show value in center when hovering
   * @default true
   */
  showCenterValue?: boolean;
  /**
   * Center value font size
   * @default 40
   */
  centerValueFontSize?: number;
  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
}
