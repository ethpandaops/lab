/**
 * Data point for MEV adoption
 */
export interface MevAdoptionDataPoint {
  /** Whether this data point used MEV-boost */
  hasMev: boolean;
}

/**
 * MevAdoptionChart component props
 */
export interface MevAdoptionChartProps {
  /** Array of data points indicating MEV usage */
  data: MevAdoptionDataPoint[];
  /** Chart title (defaults to "MEV-Boost Usage") */
  title?: string;
  /** Chart subtitle (auto-generated if not provided) */
  subtitle?: string;
  /** Chart height in pixels */
  height?: number;
  /** Anchor ID for deep linking */
  anchorId?: string;
  /** Whether chart is displayed in modal (affects sizing) */
  inModal?: boolean;
  /** Modal size when using PopoutCard */
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
