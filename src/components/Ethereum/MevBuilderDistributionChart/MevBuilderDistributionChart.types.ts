/**
 * Data point for MEV builder distribution
 */
export interface MevBuilderDataPoint {
  /** Builder identifier (address or name) */
  builder: string | null;
}

/**
 * MevBuilderDistributionChart component props
 */
export interface MevBuilderDistributionChartProps {
  /** Data points containing builder information */
  data: MevBuilderDataPoint[];
  /** Chart title (defaults to "Builder Distribution") */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Maximum number of builders to display (defaults to 10) */
  topN?: number;
  /** Chart height in pixels */
  height?: number;
  /** Anchor ID for deep linking */
  anchorId?: string;
  /** Whether chart is displayed in modal (affects sizing) */
  inModal?: boolean;
  /** Modal size when using PopoutCard */
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Truncate builder names to N characters (defaults to 16) */
  truncateLength?: number;
}
