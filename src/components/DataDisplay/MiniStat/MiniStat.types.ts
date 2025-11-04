export interface MiniStatProps {
  /**
   * The label/name of the metric
   */
  label: string;

  /**
   * The main value to display
   */
  value: string | number;

  /**
   * Optional secondary text (e.g., "/ 31,068 validators")
   */
  secondaryText?: string;

  /**
   * Percentage value for the gauge (0-100)
   * Only used when showGauge is true
   */
  percentage?: number;

  /**
   * Optional color for the gauge and percentage badge
   * Defaults to theme-based color based on percentage
   */
  color?: string;

  /**
   * Show gauge visual indicator
   * Default: false
   */
  showGauge?: boolean;
}
