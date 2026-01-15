import type { ReactNode } from 'react';

/**
 * A segment in the stacked bar
 */
export interface StackedBarSegment {
  /**
   * Unique name for this segment (used for selection/callbacks)
   */
  name: string;

  /**
   * Value of this segment
   */
  value: number;

  /**
   * Optional color override (uses theme colors by default)
   */
  color?: string;

  /**
   * Optional description shown in tooltip
   */
  description?: string;
}

/**
 * Props for the StackedBar component
 *
 * A horizontal stacked bar chart for visualizing proportional data.
 * Generic component that can be used for gas breakdowns, resource allocation,
 * budget distribution, or any proportional visualization.
 */
export interface StackedBarProps {
  /**
   * Array of segments to display in the bar
   */
  segments: StackedBarSegment[];

  /**
   * Optional total value (if different from sum of segments, e.g., for showing remainder)
   * If not provided, total is calculated from segments
   */
  total?: number;

  /**
   * Title displayed above the bar
   */
  title?: string;

  /**
   * Subtitle/summary displayed on the right of the title
   */
  subtitle?: string;

  /**
   * Footer text displayed below the bar (left side)
   */
  footerLeft?: string;

  /**
   * Footer text displayed below the bar (right side)
   */
  footerRight?: string;

  /**
   * CSS class for footer left text (e.g., 'text-warning', 'text-success')
   */
  footerLeftClassName?: string;

  /**
   * CSS class for footer right text
   */
  footerRightClassName?: string;

  /**
   * Show value labels on segments
   * @default true
   */
  showLabels?: boolean;

  /**
   * Show percentage in labels
   * @default true
   */
  showPercentages?: boolean;

  /**
   * Enable entry animation
   * @default true
   */
  animated?: boolean;

  /**
   * Height of the component in pixels (includes header/footer)
   * @default 120
   */
  height?: number;

  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;

  /**
   * Custom formatter for segment values
   * @default Formats with K/M suffix
   */
  valueFormatter?: (value: number) => string;

  /**
   * Show legend below the bar
   * @default false
   */
  showLegend?: boolean;

  /**
   * Callback when a segment is clicked
   */
  onSegmentClick?: (segment: StackedBarSegment) => void;

  /**
   * Callback when hovering over a segment (null when leaving)
   */
  onSegmentHover?: (segment: StackedBarSegment | null) => void;

  /**
   * Name of the currently selected segment (for highlighting)
   */
  selectedSegmentName?: string;

  /**
   * Minimum percentage width to render a segment (hides very small segments)
   * @default 0.5
   */
  minWidthPercent?: number;

  /**
   * Minimum percentage width to show labels on a segment
   * @default 8
   */
  minLabelWidthPercent?: number;

  /**
   * Custom tooltip renderer
   * If provided, replaces the default tooltip content
   */
  renderTooltip?: (segment: StackedBarSegment, percentage: number) => ReactNode;

  /**
   * Message to display when there are no segments or all values are zero
   * @default "No data available"
   */
  emptyMessage?: string;
}
